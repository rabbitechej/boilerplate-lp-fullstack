import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import http from 'node:http';
import bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../app';
import Admin from '../models/Admin';
import Post from '../models/Post';
import AuthSession from '../models/AuthSession';
import AuditLog from '../models/AuditLog';
import ContactMessage from '../models/ContactMessage';

let mongo: MongoMemoryServer | undefined;
let server: http.Server | undefined;
let baseUrl: string;
let accessToken = '';
let refreshCookie = '';

function parseSetCookie(header: string | number | string[] | undefined): string {
  if (!header) return '';
  const raw = Array.isArray(header) ? header[0] : String(header);
  return (raw ?? '').split(';')[0] ?? '';
}

async function request(
  method: string,
  path: string,
  options: { body?: unknown; token?: string; cookie?: string } = {},
): Promise<{ status: number; body: unknown; headers: http.IncomingHttpHeaders }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.cookie ? { Cookie: options.cookie } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const body: unknown = await response.json().catch(() => undefined);
  return { status: response.status, body, headers: Object.fromEntries(response.headers.entries()) };
}

before(async () => {
  process.env.JWT_SECRET = 'a'.repeat(32);
  process.env.JWT_ISSUER = 'test-api';
  process.env.JWT_AUDIENCE = 'test-admin';
  process.env.AUTH_COOKIE_SECURE = 'false';
  process.env.NODE_ENV = 'test';

  mongo = await MongoMemoryServer.create({
    // Versão fixa: o default às vezes aponta para builds inexistentes em distros não oficiais.
    binary: { version: '7.0.14' },
  });
  await mongoose.connect(mongo.getUri());

  const passwordHash = await bcrypt.hash('senha-segura-123', 12);
  await Admin.create({
    name: 'Admin Teste',
    email: 'admin@example.com',
    passwordHash,
    role: 'admin',
    active: true,
  });

  const app = createApp({ corsOrigins: [] });
  server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Servidor sem porta');
  baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongo) {
    await mongo.stop();
  }
});

describe('integracao: auth + posts + contato', () => {
  it('faz login e devolve access token + cookie de refresh', async () => {
    const { status, body, headers } = await request('POST', '/auth/login', {
      body: { email: 'admin@example.com', password: 'senha-segura-123' },
    });
    assert.equal(status, 200);
    const data = (body as { data: { accessToken: string } }).data;
    assert.ok(data.accessToken);
    accessToken = data.accessToken;
    refreshCookie = parseSetCookie(headers['set-cookie']);
    assert.ok(refreshCookie.includes('='));
  });

  it('renova o access token via refresh', async () => {
    const { status, body } = await request('POST', '/auth/refresh', { cookie: refreshCookie });
    assert.equal(status, 200);
    const data = (body as { data: { accessToken: string } }).data;
    assert.ok(data.accessToken);
    accessToken = data.accessToken;
    const sessions = await AuthSession.countDocuments();
    assert.ok(sessions >= 1);
  });

  it('cria, lista (paginado), atualiza e exclui um post', async () => {
    const created = await request('POST', '/admin/posts', {
      token: accessToken,
      body: {
        title: 'Post Integracao',
        slug: 'post-integracao',
        content: 'Conteudo de teste',
        published: true,
      },
    });
    assert.equal(created.status, 201);
    const postId = (created.body as { data: { id: string } }).data.id;

    const listed = await request('GET', '/admin/posts?page=1&limit=10', { token: accessToken });
    assert.equal(listed.status, 200);
    const page = (listed.body as { data: { items: unknown[]; total: number; page: number } }).data;
    assert.equal(page.page, 1);
    assert.ok(page.total >= 1);
    assert.ok(page.items.some((item) => (item as { id: string }).id === postId));

    const publicList = await request('GET', '/posts?page=1&limit=10');
    assert.equal(publicList.status, 200);
    const publicPage = (publicList.body as { data: { items: { slug: string }[] } }).data;
    assert.ok(publicPage.items.some((item) => item.slug === 'post-integracao'));

    const updated = await request('PUT', `/admin/posts/${postId}`, {
      token: accessToken,
      body: { title: 'Post Integracao Editado' },
    });
    assert.equal(updated.status, 200);
    assert.equal((updated.body as { data: { title: string } }).data.title, 'Post Integracao Editado');

    const deleted = await request('DELETE', `/admin/posts/${postId}`, { token: accessToken });
    assert.equal(deleted.status, 200);
    assert.equal(await Post.countDocuments({ _id: postId }), 0);
  });

  it('devolve X-Request-Id em toda resposta', async () => {
    const { headers } = await request('GET', '/health');
    assert.match(String(headers['x-request-id']), /^[\w.-]{1,64}$/);
  });

  it('reaproveita o X-Request-Id enviado pelo proxy', async () => {
    const response = await fetch(`${baseUrl}/health`, { headers: { 'X-Request-Id': 'req-do-proxy' } });
    assert.equal(response.headers.get('x-request-id'), 'req-do-proxy');
  });

  it('audita login e o ciclo de vida do post com ator, ip e requestId', async () => {
    const logs = await AuditLog.find().sort({ createdAt: 1 }).lean();
    const actions = logs.map((log) => `${log.action}:${log.resource}`);

    assert.ok(actions.includes('login:auth'));
    assert.ok(actions.includes('create:post'));
    assert.ok(actions.includes('update:post'));
    assert.ok(actions.includes('delete:post'));

    const createEntry = logs.find((log) => log.action === 'create' && log.resource === 'post');
    assert.ok(createEntry);
    assert.equal(createEntry.adminEmail, 'admin@example.com');
    assert.equal(createEntry.status, 'success');
    assert.ok(createEntry.adminId, 'entrada de auditoria deve identificar o admin');
    assert.ok(createEntry.ip, 'entrada de auditoria deve guardar o IP de origem');
    assert.ok(createEntry.requestId, 'entrada de auditoria deve correlacionar com a requisicao');
  });

  it('registra tentativa de login malsucedida e permite filtrar por falha', async () => {
    const failed = await request('POST', '/auth/login', {
      body: { email: 'admin@example.com', password: 'senha-errada' },
    });
    assert.equal(failed.status, 401);

    const listed = await request('GET', '/admin/audit-logs?status=failure&action=login', {
      token: accessToken,
    });
    assert.equal(listed.status, 200);
    const page = (listed.body as { data: { items: { adminEmail: string; status: string }[] } }).data;
    assert.ok(page.items.length >= 1);
    assert.ok(page.items.every((item) => item.status === 'failure'));
    assert.ok(page.items.some((item) => item.adminEmail === 'admin@example.com'));
  });

  it('recusa filtro de auditoria fora do formato esperado', async () => {
    const { status, body } = await request('GET', '/admin/audit-logs?status=talvez', {
      token: accessToken,
    });
    assert.equal(status, 400);
    assert.equal((body as { error: { code: string } }).error.code, 'INVALID_INPUT');
  });

  it('recusa payload de contato acima do limite do schema com 400 (nao 500)', async () => {
    const tooLong = await request('POST', '/contact', {
      body: {
        name: 'Visitante',
        email: 'visitante@example.com',
        message: 'x'.repeat(4001),
      },
    });
    assert.equal(tooLong.status, 400);
    assert.equal((tooLong.body as { error: { code: string } }).error.code, 'INVALID_INPUT');

    const longEmail = await request('POST', '/contact', {
      body: { name: 'Visitante', email: `${'a'.repeat(200)}@example.com`, message: 'ola' },
    });
    assert.equal(longEmail.status, 400);
  });

  it('recusa coverImageUrl que nao seja http(s)', async () => {
    const { status, body } = await request('POST', '/admin/posts', {
      token: accessToken,
      body: {
        title: 'Post com capa suspeita',
        slug: 'post-com-capa-suspeita',
        content: 'conteudo',
        coverImageUrl: 'javascript:alert(1)',
      },
    });
    assert.equal(status, 400);
    assert.match((body as { error: { message: string } }).error.message, /http\(s\)/);
    assert.equal(await Post.countDocuments({ slug: 'post-com-capa-suspeita' }), 0);
  });

  it('recebe mensagem de contato e lista no admin', async () => {
    const sent = await request('POST', '/contact', {
      body: { name: 'Visitante', email: 'visitante@example.com', message: 'Ola, equipe' },
    });
    assert.equal(sent.status, 201);

    const listed = await request('GET', '/admin/contact-messages?page=1&limit=10', {
      token: accessToken,
    });
    assert.equal(listed.status, 200);
    const page = (listed.body as { data: { items: { email: string }[]; total: number } }).data;
    assert.ok(page.total >= 1);
    assert.ok(page.items.some((item) => item.email === 'visitante@example.com'));
    assert.equal(await ContactMessage.countDocuments(), page.total);
  });
});
