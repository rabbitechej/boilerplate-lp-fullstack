import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isTextWithinLimit,
  isValidEmail,
  isValidHttpUrl,
  isValidObjectId,
  isValidSlug,
} from './validation';

describe('isValidEmail', () => {
  it('aceita email valido', () => {
    assert.equal(isValidEmail('a@b.com'), true);
  });

  it('rejeita email invalido', () => {
    assert.equal(isValidEmail('nao-e-email'), false);
  });
});

describe('isValidSlug', () => {
  it('aceita slug valido', () => {
    assert.equal(isValidSlug('meu-post-1'), true);
  });

  it('rejeita slug com espacos ou maiusculas', () => {
    assert.equal(isValidSlug('Meu Post'), false);
  });
});

describe('isValidObjectId', () => {
  it('aceita ObjectId hexadecimal de 24 caracteres', () => {
    assert.equal(isValidObjectId('507f1f77bcf86cd799439011'), true);
  });

  it('rejeita string curta', () => {
    assert.equal(isValidObjectId('123'), false);
  });
});

describe('isValidEmail (limite de tamanho)', () => {
  it('rejeita email acima do maxlength do schema (200)', () => {
    // Sem o limite aqui, o valor passava na validacao e so' quebrava no Mongo,
    // virando 500 em vez de 400.
    const huge = `${'a'.repeat(200)}@exemplo.com`;
    assert.equal(isValidEmail(huge), false);
  });

  it('aceita email exatamente no limite', () => {
    const local = 'a'.repeat(200 - '@exemplo.com'.length);
    assert.equal(isValidEmail(`${local}@exemplo.com`), true);
  });
});

describe('isTextWithinLimit', () => {
  it('aceita texto preenchido dentro do limite', () => {
    assert.equal(isTextWithinLimit('mensagem', 100), true);
  });

  it('rejeita texto vazio ou so com espacos', () => {
    assert.equal(isTextWithinLimit('   ', 100), false);
    assert.equal(isTextWithinLimit('', 100), false);
  });

  it('rejeita texto acima do limite', () => {
    assert.equal(isTextWithinLimit('a'.repeat(101), 100), false);
  });

  it('rejeita valores que nao sao string', () => {
    assert.equal(isTextWithinLimit(42, 100), false);
    assert.equal(isTextWithinLimit(null, 100), false);
  });
});

describe('isValidHttpUrl', () => {
  it('aceita http e https', () => {
    assert.equal(isValidHttpUrl('https://cdn.exemplo.com/foto.png'), true);
    assert.equal(isValidHttpUrl('http://localhost:5000/foto.png'), true);
  });

  it('rejeita esquemas que viram XSS quando renderizados', () => {
    assert.equal(isValidHttpUrl('javascript:alert(1)'), false);
    assert.equal(isValidHttpUrl('data:text/html;base64,PHNjcmlwdD4='), false);
  });

  it('rejeita URL relativa ou texto solto', () => {
    assert.equal(isValidHttpUrl('/foto.png'), false);
    assert.equal(isValidHttpUrl('nao e url'), false);
  });

  it('rejeita URL absurdamente longa', () => {
    assert.equal(isValidHttpUrl(`https://exemplo.com/${'a'.repeat(2100)}`), false);
  });
});
