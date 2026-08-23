// Acentos combinantes (U+0300–U+036F), separados da letra base pelo NFD.
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

/**
 * Converte texto livre no formato de slug aceito pela API
 * (`^[a-z0-9]+(?:-[a-z0-9]+)*$`): `"Título com Ação!"` → `"titulo-com-acao"`.
 *
 * O `normalize('NFD')` decompõe cada caractere acentuado em letra base +
 * acento; apagar só os acentos cobre qualquer idioma, sem tabela de "á→a".
 *
 * Isto é **conveniência de formulário**, não validação: quem decide se o slug
 * é aceitável continua sendo o `isValidSlug` do backend.
 */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
