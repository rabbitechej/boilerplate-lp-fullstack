import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import RateLimit from './RateLimit';

describe('RateLimit model', () => {
  it('declara chave unica e indice TTL por expiresAt', () => {
    const indexes = RateLimit.schema.indexes();

    assert.ok(indexes.some(([fields, options]) => fields.key === 1 && options.unique === true));
    assert.ok(
      indexes.some(
        ([fields, options]) => fields.expiresAt === 1 && options.expireAfterSeconds === 0,
      ),
    );
  });
});
