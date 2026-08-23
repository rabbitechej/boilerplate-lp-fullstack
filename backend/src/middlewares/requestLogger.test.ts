import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeRequestId } from './requestLogger';

describe('normalizeRequestId', () => {
  it('reaproveita um id valido enviado pelo proxy', () => {
    assert.equal(normalizeRequestId('abc-123_XYZ.1'), 'abc-123_XYZ.1');
  });

  it('gera um novo id quando o header esta ausente', () => {
    assert.match(normalizeRequestId(undefined), /^[0-9a-f-]{36}$/);
  });

  it('descarta ids com caracteres de controle ou quebras de linha', () => {
    const forged = 'ok\n2026-01-01 ERROR log forjado';
    assert.notEqual(normalizeRequestId(forged), forged);
  });

  it('descarta ids longos demais', () => {
    assert.notEqual(normalizeRequestId('a'.repeat(65)), 'a'.repeat(65));
  });

  it('ignora valores que nao sao string (header repetido)', () => {
    assert.match(normalizeRequestId(['a', 'b']), /^[0-9a-f-]{36}$/);
  });
});
