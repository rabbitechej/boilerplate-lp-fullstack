import { describe, expect, it } from 'vitest';
import { features, readFlag } from './features';

describe('readFlag', () => {
  it('cai no padrão quando a variável não está definida', () => {
    expect(readFlag(undefined, true)).toBe(true);
    expect(readFlag(undefined, false)).toBe(false);
    expect(readFlag('', true)).toBe(true);
  });

  it('reconhece as formas de desligar', () => {
    expect(readFlag('false', true)).toBe(false);
    expect(readFlag('0', true)).toBe(false);
    expect(readFlag('  FALSE  ', true)).toBe(false);
  });

  it('reconhece as formas de ligar', () => {
    expect(readFlag('true', false)).toBe(true);
    expect(readFlag('1', false)).toBe(true);
  });

  it('ignora valor desconhecido e mantém o padrão', () => {
    expect(readFlag('talvez', true)).toBe(true);
    expect(readFlag('talvez', false)).toBe(false);
  });
});

describe('features', () => {
  it('vem com o blog ligado quando VITE_ENABLE_BLOG não é definida', () => {
    expect(features.blog).toBe(true);
  });
});
