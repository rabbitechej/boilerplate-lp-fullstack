import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parsePagination, toPaginatedResult } from './pagination';

describe('parsePagination', () => {
  it('usa page=1 e limit=20 por padrao', () => {
    assert.deepEqual(parsePagination({}), { page: 1, limit: 20, skip: 0 });
  });

  it('respeita page e limit validos', () => {
    assert.deepEqual(parsePagination({ page: '3', limit: '10' }), {
      page: 3,
      limit: 10,
      skip: 20,
    });
  });

  it('limita o limit a 100', () => {
    assert.equal(parsePagination({ limit: '500' }).limit, 100);
  });

  it('ignora valores invalidos', () => {
    assert.deepEqual(parsePagination({ page: '0', limit: '-1' }), {
      page: 1,
      limit: 20,
      skip: 0,
    });
  });
});

describe('toPaginatedResult', () => {
  it('calcula totalPages', () => {
    assert.deepEqual(toPaginatedResult(['a', 'b'], 25, 1, 10), {
      items: ['a', 'b'],
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it('garante totalPages minimo 1', () => {
    assert.equal(toPaginatedResult([], 0, 1, 20).totalPages, 1);
  });
});
