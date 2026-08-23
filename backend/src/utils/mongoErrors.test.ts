import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isDuplicateKeyError, isValidationError } from './mongoErrors';

describe('isDuplicateKeyError', () => {
  it('reconhece um erro de chave duplicada do Mongo (code 11000)', () => {
    assert.equal(isDuplicateKeyError({ code: 11000, message: 'E11000 duplicate key' }), true);
  });

  it('rejeita erros sem o code 11000', () => {
    assert.equal(isDuplicateKeyError(new Error('outro erro')), false);
    assert.equal(isDuplicateKeyError({ code: 500 }), false);
    assert.equal(isDuplicateKeyError(null), false);
    assert.equal(isDuplicateKeyError(undefined), false);
  });
});

describe('isValidationError', () => {
  it('reconhece o ValidationError do Mongoose', () => {
    const error = Object.assign(new Error('Post validation failed'), { name: 'ValidationError' });
    assert.equal(isValidationError(error), true);
  });

  it('rejeita erros comuns', () => {
    assert.equal(isValidationError(new Error('qualquer coisa')), false);
    assert.equal(isValidationError(null), false);
    assert.equal(isValidationError('ValidationError'), false);
  });
});
