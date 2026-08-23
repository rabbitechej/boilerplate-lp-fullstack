/**
 * Flags de módulo do frontend.
 *
 * São variáveis `VITE_*`: o Vite as embute no bundle no momento do **build**,
 * não são lidas em runtime. Mudar uma flag exige rodar o build de novo.
 *
 * Cada flag tem um par no backend (ex.: `VITE_ENABLE_BLOG` ↔ `ENABLE_BLOG`).
 * Mantenha os dois em sincronia: desligar só de um lado deixa links levando a
 * rotas que respondem 404, ou telas pedindo dados que a API não serve mais.
 */
export function readFlag(value: string | undefined, fallback: boolean): boolean {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'false' || normalized === '0') return false;
  if (normalized === 'true' || normalized === '1') return true;
  return fallback;
}

export const features = {
  /** Blog/conteúdos: páginas públicas de posts + CRUD no painel. */
  blog: readFlag(import.meta.env.VITE_ENABLE_BLOG, true),
};
