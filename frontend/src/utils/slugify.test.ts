import { describe, expect, it } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('remove acentos e normaliza para minúsculas com hífens', () => {
    expect(slugify('Título com Ação!')).toBe('titulo-com-acao');
  });

  it('colapsa separadores repetidos e apara as pontas', () => {
    expect(slugify('  --  Olá   mundo  --  ')).toBe('ola-mundo');
  });

  it('preserva números', () => {
    expect(slugify('10 dicas de SEO em 2026')).toBe('10-dicas-de-seo-em-2026');
  });

  it('cobre acentos além do português', () => {
    expect(slugify('Crème Brûlée à la Française')).toBe('creme-brulee-a-la-francaise');
  });

  it('devolve string vazia quando não sobra nada aproveitável', () => {
    expect(slugify('!!! ???')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('gera sempre um slug que a API aceita', () => {
    const pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    for (const input of ['Post Nº 1 — Início', 'ÁÉÍÓÚ', 'a  b   c']) {
      expect(slugify(input)).toMatch(pattern);
    }
  });
});
