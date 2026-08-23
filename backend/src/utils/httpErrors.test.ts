import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toClientError } from './httpErrors';

describe('toClientError', () => {
  it('traduz JSON malformado do body-parser', () => {
    const error = Object.assign(new SyntaxError('Unexpected token'), {
      status: 400,
      type: 'entity.parse.failed',
    });
    assert.deepEqual(toClientError(error), {
      status: 400,
      code: 'INVALID_JSON',
      message: 'O corpo da requisicao nao e um JSON valido.',
    });
  });

  it('preserva o 413 de corpo acima do limite', () => {
    const error = Object.assign(new Error('request entity too large'), {
      status: 413,
      type: 'entity.too.large',
    });
    assert.equal(toClientError(error)?.status, 413);
    assert.equal(toClientError(error)?.code, 'PAYLOAD_TOO_LARGE');
  });

  it('aceita statusCode alem de status', () => {
    assert.equal(toClientError(Object.assign(new Error('x'), { statusCode: 400 }))?.status, 400);
  });

  it('usa mensagem generica para 4xx de tipo desconhecido', () => {
    const result = toClientError(Object.assign(new Error('x'), { status: 422 }));
    assert.equal(result?.status, 422);
    assert.equal(result?.code, 'INVALID_INPUT');
  });

  it('ignora erros de servidor e erros sem status', () => {
    assert.equal(toClientError(Object.assign(new Error('x'), { status: 500 })), undefined);
    assert.equal(toClientError(new Error('erro comum')), undefined);
    assert.equal(toClientError(null), undefined);
    assert.equal(toClientError('texto'), undefined);
  });
});
