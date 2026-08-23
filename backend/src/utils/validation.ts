const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Espelha o maxlength do schema (Admin.email / ContactMessage.email): validar
// aqui devolve 400 com mensagem util em vez de estourar no Mongo como 500.
const MAX_EMAIL_LENGTH = 200;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidEmail(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  const trimmed = value.trim();
  return trimmed.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(trimmed);
}

/** String preenchida e dentro do limite do schema correspondente. */
export function isTextWithinLimit(value: unknown, maxLength: number): value is string {
  return isNonEmptyString(value) && value.trim().length <= maxLength;
}

/**
 * URL http(s) absoluta. Usada em campos que o painel entrega direto para o
 * browser (ex.: capa do post), onde um `javascript:` ou `data:` viraria XSS
 * dependendo de onde o frontend renderizar.
 */
export function isValidHttpUrl(value: unknown): value is string {
  if (!isNonEmptyString(value) || value.trim().length > 2048) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidSlug(value: unknown): value is string {
  return isNonEmptyString(value) && SLUG_PATTERN.test(value.trim());
}


export function isValidObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}
