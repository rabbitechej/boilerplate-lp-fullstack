import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  getCorsOrigins,
  getLogFormat,
  getLogLevel,
  getPort,
  getTrustProxy,
  isApiDocsEnabled,
  isBlogEnabled,
  requireEnv,
} from './env';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('requireEnv', () => {
  it('retorna o valor quando a variavel existe', () => {
    process.env.FOO = 'bar';
    assert.equal(requireEnv('FOO'), 'bar');
  });

  it('lanca erro quando a variavel esta ausente', () => {
    delete process.env.FOO;
    assert.throws(() => requireEnv('FOO'));
  });
});

describe('getPort', () => {
  it('usa 5000 como padrao', () => {
    delete process.env.PORT;
    assert.equal(getPort(), 5000);
  });

  it('lanca erro para porta invalida', () => {
    process.env.PORT = 'abc';
    assert.throws(() => getPort());
  });
});

describe('getCorsOrigins', () => {
  it('retorna localhost em desenvolvimento quando nao configurado', () => {
    delete process.env.CORS_ORIGINS;
    process.env.NODE_ENV = 'development';
    assert.deepEqual(getCorsOrigins(), ['http://localhost:5173']);
  });

  it('faz parse de lista separada por virgula', () => {
    process.env.CORS_ORIGINS = 'https://a.com, https://b.com';
    assert.deepEqual(getCorsOrigins(), ['https://a.com', 'https://b.com']);
  });
});

describe('getTrustProxy', () => {
  it('retorna false quando nao configurado', () => {
    delete process.env.TRUST_PROXY;
    assert.equal(getTrustProxy(), false);
  });

  it('retorna numero de hops quando configurado', () => {
    process.env.TRUST_PROXY = '2';
    assert.equal(getTrustProxy(), 2);
  });
});

describe('isBlogEnabled', () => {
  it('vem ligado por padrao', () => {
    delete process.env.ENABLE_BLOG;
    assert.equal(isBlogEnabled(), true);
  });

  it('desliga com false ou 0', () => {
    process.env.ENABLE_BLOG = 'false';
    assert.equal(isBlogEnabled(), false);
    process.env.ENABLE_BLOG = '0';
    assert.equal(isBlogEnabled(), false);
  });

  it('ignora maiusculas e espacos', () => {
    process.env.ENABLE_BLOG = '  FALSE ';
    assert.equal(isBlogEnabled(), false);
  });
});

describe('isApiDocsEnabled', () => {
  it('liga fora de producao e desliga em producao', () => {
    delete process.env.ENABLE_API_DOCS;
    process.env.NODE_ENV = 'development';
    assert.equal(isApiDocsEnabled(), true);
    process.env.NODE_ENV = 'production';
    assert.equal(isApiDocsEnabled(), false);
  });

  it('permite forcar em producao', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_API_DOCS = 'true';
    assert.equal(isApiDocsEnabled(), true);
  });
});

describe('getLogLevel / getLogFormat', () => {
  it('usa debug + pretty em desenvolvimento', () => {
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_FORMAT;
    delete process.env.NODE_TEST_CONTEXT;
    process.env.NODE_ENV = 'development';
    assert.equal(getLogLevel(), 'debug');
    assert.equal(getLogFormat(), 'pretty');
  });

  it('usa info + json em producao', () => {
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_FORMAT;
    delete process.env.NODE_TEST_CONTEXT;
    process.env.NODE_ENV = 'production';
    assert.equal(getLogLevel(), 'info');
    assert.equal(getLogFormat(), 'json');
  });

  it('fica silencioso nos testes', () => {
    delete process.env.LOG_LEVEL;
    process.env.NODE_ENV = 'test';
    assert.equal(getLogLevel(), 'silent');
  });

  it('recusa valor desconhecido em vez de cair num padrao silencioso', () => {
    process.env.LOG_LEVEL = 'verboso';
    assert.throws(() => getLogLevel(), /LOG_LEVEL invalido/);
    process.env.LOG_FORMAT = 'xml';
    assert.throws(() => getLogFormat(), /LOG_FORMAT invalido/);
  });
});
