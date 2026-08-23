import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createLogger, formatLogEntry, sanitizeFields, serializeError } from './logger';
import { runWithRequestContext } from './requestContext';

function captureLogger(level: 'debug' | 'info' | 'warn' | 'error' = 'debug', format: 'json' | 'pretty' = 'json') {
  const lines: string[] = [];
  const logger = createLogger({
    level,
    format,
    write: (line) => lines.push(line),
    now: () => new Date('2026-01-02T03:04:05.000Z'),
  });
  return { logger, lines };
}

describe('sanitizeFields', () => {
  it('mascara chaves sensiveis em qualquer profundidade', () => {
    const result = sanitizeFields({
      email: 'admin@example.com',
      password: 'segredo',
      body: { refreshToken: 'abc', nested: { API_KEY: 'x', ok: 1 } },
    });

    assert.deepEqual(result, {
      email: 'admin@example.com',
      password: '[REDACTED]',
      body: { refreshToken: '[REDACTED]', nested: { API_KEY: '[REDACTED]', ok: 1 } },
    });
  });

  it('resolve referencias circulares sem estourar a pilha', () => {
    const node: Record<string, unknown> = { name: 'raiz' };
    node.self = node;
    assert.deepEqual(sanitizeFields({ node }), { node: { name: 'raiz', self: '[Circular]' } });
  });

  it('corta arrays e strings gigantes', () => {
    const result = sanitizeFields({
      items: Array.from({ length: 25 }, (_, index) => index),
      text: 'a'.repeat(2500),
    }) as { items: unknown[]; text: string };

    assert.equal(result.items.length, 21);
    assert.equal(result.items.at(-1), '...mais 5 itens');
    assert.ok(result.text.endsWith('...[truncado]'));
  });
});

describe('serializeError', () => {
  it('extrai nome, mensagem e stack', () => {
    const serialized = serializeError(new TypeError('quebrou'));
    assert.equal(serialized.name, 'TypeError');
    assert.equal(serialized.message, 'quebrou');
    assert.ok(typeof serialized.stack === 'string');
  });

  it('aceita valores que nao sao Error', () => {
    assert.deepEqual(serializeError('falha textual'), { message: 'falha textual' });
  });
});

describe('formatLogEntry', () => {
  const entry = {
    level: 'info' as const,
    time: '2026-01-02T03:04:05.000Z',
    message: 'ola',
    fields: { status: 200, path: '/health' },
  };

  it('gera uma linha JSON por evento', () => {
    assert.deepEqual(JSON.parse(formatLogEntry('json', entry)), {
      level: 'info',
      time: '2026-01-02T03:04:05.000Z',
      message: 'ola',
      status: 200,
      path: '/health',
    });
  });

  it('gera texto legivel no formato pretty', () => {
    assert.equal(
      formatLogEntry('pretty', entry),
      '2026-01-02T03:04:05.000Z INFO  ola status=200 path=/health',
    );
  });
});

describe('createLogger', () => {
  it('respeita o nivel minimo configurado', () => {
    const { logger, lines } = captureLogger('warn');
    logger.debug('ignorado');
    logger.info('ignorado');
    logger.warn('registrado');
    logger.error('registrado');
    assert.equal(lines.length, 2);
  });

  it('nao emite nada no nivel silent', () => {
    const lines: string[] = [];
    const logger = createLogger({ level: 'silent', format: 'json', write: (line) => lines.push(line) });
    logger.error('nem isso');
    assert.equal(lines.length, 0);
  });

  it('herda os campos do logger pai em child()', () => {
    const { logger, lines } = captureLogger();
    logger.child({ channel: 'audit' }).info('evento', { action: 'login' });
    assert.deepEqual(JSON.parse(lines[0]!), {
      level: 'info',
      time: '2026-01-02T03:04:05.000Z',
      message: 'evento',
      channel: 'audit',
      action: 'login',
    });
  });

  it('inclui o requestId do contexto da requisicao', () => {
    const { logger, lines } = captureLogger();
    runWithRequestContext({ requestId: 'req-1', adminId: 'admin-1' }, () => {
      logger.info('dentro da requisicao');
    });
    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
    assert.equal(parsed.requestId, 'req-1');
    assert.equal(parsed.adminId, 'admin-1');
  });

  it('serializa o campo err como objeto de erro', () => {
    const { logger, lines } = captureLogger();
    logger.error('falhou', { err: new Error('detalhe') });
    const parsed = JSON.parse(lines[0]!) as { err: { message: string; name: string } };
    assert.equal(parsed.err.message, 'detalhe');
    assert.equal(parsed.err.name, 'Error');
  });
});
