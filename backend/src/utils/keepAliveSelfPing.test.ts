import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import {
  getKeepAliveIntervalMs,
  getKeepAlivePublicBaseUrl,
  isKeepAliveSelfPingEnabled,
  pingKeepAliveUrl,
  startKeepAliveSelfPing,
} from './keepAliveSelfPing';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.KEEP_ALIVE_SELF_PING;
  delete process.env.KEEP_ALIVE_URL;
  delete process.env.API_BASE_URL;
  delete process.env.PUBLIC_URL;
  delete process.env.RENDER_EXTERNAL_URL;
  delete process.env.KEEP_ALIVE_INTERVAL_MS;
});

describe('isKeepAliveSelfPingEnabled', () => {
  it('desliga fora de production por padrao', () => {
    process.env.NODE_ENV = 'development';
    assert.equal(isKeepAliveSelfPingEnabled(), false);
  });

  it('liga em production por padrao', () => {
    process.env.NODE_ENV = 'production';
    assert.equal(isKeepAliveSelfPingEnabled(), true);
  });

  it('respeita KEEP_ALIVE_SELF_PING=true fora de production', () => {
    process.env.NODE_ENV = 'development';
    process.env.KEEP_ALIVE_SELF_PING = 'true';
    assert.equal(isKeepAliveSelfPingEnabled(), true);
  });

  it('respeita KEEP_ALIVE_SELF_PING=false em production', () => {
    process.env.NODE_ENV = 'production';
    process.env.KEEP_ALIVE_SELF_PING = 'false';
    assert.equal(isKeepAliveSelfPingEnabled(), false);
  });
});

describe('getKeepAlivePublicBaseUrl', () => {
  it('prioriza KEEP_ALIVE_URL e remove barra final', () => {
    process.env.KEEP_ALIVE_URL = 'https://api.example.com/';
    assert.equal(getKeepAlivePublicBaseUrl(), 'https://api.example.com');
  });

  it('usa API_BASE_URL antes de RENDER_EXTERNAL_URL', () => {
    process.env.API_BASE_URL = 'https://api.example.com';
    process.env.RENDER_EXTERNAL_URL = 'https://svc.onrender.com';
    assert.equal(getKeepAlivePublicBaseUrl(), 'https://api.example.com');
  });

  it('cai para RENDER_EXTERNAL_URL quando as demais estao vazias', () => {
    process.env.RENDER_EXTERNAL_URL = 'https://svc.onrender.com';
    assert.equal(getKeepAlivePublicBaseUrl(), 'https://svc.onrender.com');
  });

  it('retorna null sem candidatos', () => {
    assert.equal(getKeepAlivePublicBaseUrl(), null);
  });
});

describe('getKeepAliveIntervalMs', () => {
  it('usa 4 min por padrao', () => {
    assert.equal(getKeepAliveIntervalMs(), 4 * 60 * 1000);
  });

  it('aceita KEEP_ALIVE_INTERVAL_MS valido', () => {
    process.env.KEEP_ALIVE_INTERVAL_MS = '300000';
    assert.equal(getKeepAliveIntervalMs(), 300000);
  });

  it('ignora valor abaixo de 60s', () => {
    process.env.KEEP_ALIVE_INTERVAL_MS = '500';
    assert.equal(getKeepAliveIntervalMs(), 4 * 60 * 1000);
  });
});

describe('pingKeepAliveUrl', () => {
  it('nao lanca em resposta nao-ok', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => new Response('nope', { status: 503 })) as typeof fetch;
    try {
      await assert.doesNotReject(() => pingKeepAliveUrl('https://api.example.com/ready'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('startKeepAliveSelfPing', () => {
  it('retorna null quando desabilitado', () => {
    process.env.NODE_ENV = 'development';
    assert.equal(startKeepAliveSelfPing(), null);
  });

  it('retorna null sem URL publica', () => {
    process.env.NODE_ENV = 'production';
    assert.equal(startKeepAliveSelfPing(), null);
  });

  it('agenda intervalo quando habilitado', () => {
    process.env.NODE_ENV = 'production';
    process.env.RENDER_EXTERNAL_URL = 'https://svc.onrender.com';
    process.env.KEEP_ALIVE_INTERVAL_MS = '60000';

    const ping = mock.fn(async () => undefined);
    const handle = startKeepAliveSelfPing(ping);

    assert.ok(handle);
    assert.equal(ping.mock.callCount(), 0);
    handle?.stop();
  });
});
