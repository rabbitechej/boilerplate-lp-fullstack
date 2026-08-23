import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from './app';

const originalNodeEnv = process.env.NODE_ENV;
const originalEnableApiDocs = process.env.ENABLE_API_DOCS;
const originalEnableBlog = process.env.ENABLE_BLOG;

before(() => {
  process.env.JWT_SECRET = 'a'.repeat(32);
  // Estes testes rodam sem banco. O rate limit e' fail-open, mas por padrao
  // esperaria 10s pelo buffer do Mongoose antes de desistir — o que so'
  // deixaria a suite lenta, sem mudar o resultado.
  mongoose.set('bufferTimeoutMS', 50);
});

after(() => {
  process.env.NODE_ENV = originalNodeEnv;
  process.env.ENABLE_API_DOCS = originalEnableApiDocs;
  process.env.ENABLE_BLOG = originalEnableBlog;
});

/** Sobe o app, roda o assert e fecha o servidor. */
async function withApp(check: (server: http.Server) => Promise<void>): Promise<void> {
  const server = createApp({ corsOrigins: [] }).listen(0);
  try {
    await check(server);
  } finally {
    server.close();
  }
}

/** POST cru, para exercitar corpo malformado (o helper `request` só faz GET). */
async function post(
  server: http.Server,
  path: string,
  init: RequestInit,
): Promise<{ status: number; body: { error?: { code?: string } } }> {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Servidor sem porta');
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method: 'POST', ...init });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body: body as { error?: { code?: string } } };
}

function request(server: http.Server, path: string): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const address = server.address();
    if (!address || typeof address === 'string') {
      reject(new Error('Servidor sem endereco'));
      return;
    }
    http.get(`http://127.0.0.1:${address.port}${path}`, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode ?? 0, body: raw ? JSON.parse(raw) : undefined });
      });
    }).on('error', reject);
  });
}

describe('createApp', () => {
  it('responde 200 em /health', async () => {
    await withApp(async (server) => {
      const { status, body } = await request(server, '/health');
      assert.equal(status, 200);
      assert.deepEqual(body, { data: { status: 'ok' } });
    });
  });

  it('responde 404 com contrato de erro padronizado para rota inexistente', async () => {
    await withApp(async (server) => {
      const { status, body } = await request(server, '/rota-que-nao-existe');
      assert.equal(status, 404);
      assert.deepEqual(body, { error: { code: 'NOT_FOUND', message: 'Rota nao encontrada.' } });
    });
  });
});

describe('Swagger UI', () => {
  it('fica exposto fora de producao', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ENABLE_API_DOCS;
    await withApp(async (server) => {
      assert.equal((await request(server, '/api/docs.json')).status, 200);
    });
  });

  it('some em producao, caindo no 404 padrao', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_API_DOCS;
    await withApp(async (server) => {
      const docsJson = await request(server, '/api/docs.json');
      assert.equal(docsJson.status, 404);
      assert.deepEqual(docsJson.body, {
        error: { code: 'NOT_FOUND', message: 'Rota nao encontrada.' },
      });
      assert.equal((await request(server, '/api/docs/')).status, 404);
    });
  });

  it('volta em producao com ENABLE_API_DOCS=true', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_API_DOCS = 'true';
    await withApp(async (server) => {
      assert.equal((await request(server, '/api/docs.json')).status, 200);
    });
  });
});

describe('modulo de blog (ENABLE_BLOG)', () => {
  it('nao monta as rotas de posts quando desligado', async () => {
    process.env.ENABLE_BLOG = 'false';
    await withApp(async (server) => {
      const { status, body } = await request(server, '/api/v1/posts');
      assert.equal(status, 404);
      assert.deepEqual(body, { error: { code: 'NOT_FOUND', message: 'Rota nao encontrada.' } });
      assert.equal((await request(server, '/api/v1/posts/algum-slug')).status, 404);
    });
  });

  it('mantem as demais rotas de pe com o blog desligado', async () => {
    process.env.ENABLE_BLOG = 'false';
    await withApp(async (server) => {
      assert.equal((await request(server, '/health')).status, 200);
      // Rota administrativa continua existindo — 401 (e nao 404) prova que
      // esta montada, so' exigindo autenticacao.
      assert.equal((await request(server, '/api/v1/admin/audit-logs')).status, 401);
    });
  });

  it('some do Swagger quando desligado', async () => {
    process.env.ENABLE_BLOG = 'false';
    process.env.NODE_ENV = 'development';
    delete process.env.ENABLE_API_DOCS;
    await withApp(async (server) => {
      const { body } = await request(server, '/api/docs.json');
      const paths = (body as { paths: Record<string, unknown> }).paths;
      assert.equal(paths['/posts'], undefined);
      assert.equal(paths['/admin/posts'], undefined);
      assert.ok(paths['/contact'], 'rotas fora do blog continuam documentadas');
    });
  });

  it('monta as rotas de posts quando ligado', async () => {
    process.env.ENABLE_BLOG = 'true';
    await withApp(async (server) => {
      // Sem banco conectado a listagem nao completa, mas o 404 de rota
      // inexistente sumiu: o router esta montado.
      const { status, body } = await request(server, '/api/v1/admin/posts');
      assert.equal(status, 401);
      assert.equal((body as { error: { code: string } }).error.code, 'UNAUTHORIZED');
    });
  });
});

describe('requisicoes malformadas', () => {
  it('responde 400 (nao 500) quando nao ha corpo JSON para desestruturar', async () => {
    // No Express 5 o req.body fica undefined sem Content-Type: sem o guard, o
    // `const { name } = req.body` da rota lancaria TypeError.
    await withApp(async (server) => {
      const { status, body } = await post(server, '/api/v1/contact', { body: 'texto solto' });
      assert.equal(status, 400);
      assert.equal(body.error?.code, 'INVALID_INPUT');
    });
  });

  it('responde 400 com codigo proprio para JSON invalido', async () => {
    await withApp(async (server) => {
      const { status, body } = await post(server, '/api/v1/contact', {
        headers: { 'Content-Type': 'application/json' },
        body: '{quebrado',
      });
      assert.equal(status, 400);
      assert.equal(body.error?.code, 'INVALID_JSON');
    });
  });

  it('responde 413 para corpo acima do limite de 1mb', async () => {
    await withApp(async (server) => {
      const { status, body } = await post(server, '/api/v1/contact', {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'a'.repeat(1_200_000) }),
      });
      assert.equal(status, 413);
      assert.equal(body.error?.code, 'PAYLOAD_TOO_LARGE');
    });
  });
});
