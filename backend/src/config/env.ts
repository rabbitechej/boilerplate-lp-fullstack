export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'silent'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const LOG_FORMATS = ['json', 'pretty'] as const;
export type LogFormat = (typeof LOG_FORMATS)[number];

const REQUIRED_SERVER_VARIABLES = [
  'MONGODB_URI',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }
  return value;
}

export function validateServerEnv(): void {
  const missing = REQUIRED_SERVER_VARIABLES.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Variaveis de ambiente obrigatorias ausentes: ${missing.join(', ')}`);
  }

  if (requireEnv('JWT_SECRET').length < 32) {
    throw new Error('JWT_SECRET deve possuir pelo menos 32 caracteres');
  }

  if (process.env.NODE_ENV === 'production') {
    if (getCorsOrigins().length === 0) {
      throw new Error('CORS_ORIGINS deve ser configurado em producao');
    }
    if (!isSecureAuthCookie()) {
      throw new Error('AUTH_COOKIE_SECURE deve ser true em producao');
    }
  }
}

export function getPort(): number {
  const value = process.env.PORT ?? '5000';
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT invalida: ${value}`);
  }
  return port;
}

export function getCorsOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured && configured.length > 0) {
    return configured;
  }

  return process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173'];
}

export function getTrustProxy(): boolean | number {
  const value = process.env.TRUST_PROXY?.trim();
  if (!value || value === '0' || value === 'false') return false;
  if (value === 'true') return 1;

  const hops = Number(value);
  if (!Number.isInteger(hops) || hops < 0) {
    throw new Error(`TRUST_PROXY invalido: ${value}`);
  }
  return hops;
}

function readPositiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} deve ser um numero inteiro positivo`);
  }
  return value;
}

export function getAccessTokenTtlSeconds(): number {
  return readPositiveInteger('ACCESS_TOKEN_TTL_MINUTES', 15) * 60;
}

export function getRefreshTokenTtlMs(): number {
  return readPositiveInteger('REFRESH_TOKEN_TTL_DAYS', 7) * 24 * 60 * 60 * 1000;
}

export function getSessionIdleTtlMs(): number {
  return readPositiveInteger('SESSION_IDLE_TTL_MINUTES', 60) * 60 * 1000;
}

export function isSecureAuthCookie(): boolean {
  const configured = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (configured === 'true') return true;
  if (configured === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

export function getJwtIssuer(): string {
  return process.env.JWT_ISSUER?.trim() || 'boilerplate-api';
}

export function getJwtAudience(): string {
  return process.env.JWT_AUDIENCE?.trim() || 'boilerplate-admin';
}

/**
 * Nivel minimo de log. Padrao: `debug` em desenvolvimento, `info` em producao e
 * `silent` durante os testes (para nao poluir a saida do runner).
 */
export function getLogLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (configured && (LOG_LEVELS as readonly string[]).includes(configured)) {
    return configured as LogLevel;
  }
  if (configured) {
    throw new Error(`LOG_LEVEL invalido: ${configured}. Use um de: ${LOG_LEVELS.join(', ')}`);
  }
  // NODE_TEST_CONTEXT e' definido pelo runner do `node --test`.
  if (process.env.NODE_ENV === 'test' || process.env.NODE_TEST_CONTEXT) return 'silent';
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

/**
 * Formato da saida: `json` (uma linha por evento, para agregadores tipo Render,
 * Datadog ou Loki) ou `pretty` (legivel no terminal). Padrao: json em producao.
 */
export function getLogFormat(): LogFormat {
  const configured = process.env.LOG_FORMAT?.trim().toLowerCase();
  if (configured && (LOG_FORMATS as readonly string[]).includes(configured)) {
    return configured as LogFormat;
  }
  if (configured) {
    throw new Error(`LOG_FORMAT invalido: ${configured}. Use um de: ${LOG_FORMATS.join(', ')}`);
  }
  return process.env.NODE_ENV === 'production' ? 'json' : 'pretty';
}

/**
 * Swagger UI (`/api/docs`) fica ligado fora de producao e desligado em
 * producao. Expor o mapa completo da API — incluindo rotas administrativas —
 * so' facilita reconhecimento; quem realmente precisa liga com
 * `ENABLE_API_DOCS=true` (idealmente atras de uma rede/proxy restrito).
 */
export function isApiDocsEnabled(): boolean {
  const configured = process.env.ENABLE_API_DOCS?.trim().toLowerCase();
  if (configured === 'true' || configured === '1') return true;
  if (configured === 'false' || configured === '0') return false;
  return process.env.NODE_ENV !== 'production';
}

/**
 * Modulo de blog/conteudos (`Post`). Nem todo projeto que nasce deste
 * boilerplate precisa de blog — com `ENABLE_BLOG=false` as rotas publicas e
 * administrativas de posts nao sao montadas (caem no 404 padrao) e o Swagger
 * deixa de documenta-las. O model continua no codigo: desligar e' reversivel e
 * nao apaga nada que ja exista no banco.
 */
export function isBlogEnabled(): boolean {
  const configured = process.env.ENABLE_BLOG?.trim().toLowerCase();
  if (configured === 'false' || configured === '0') return false;
  if (configured === 'true' || configured === '1') return true;
  return true;
}
