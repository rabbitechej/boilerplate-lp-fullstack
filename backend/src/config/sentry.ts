import * as Sentry from '@sentry/node';

/**
 * Inicializa o Sentry se `SENTRY_DSN` estiver definido.
 * Seguro chamar sem DSN (no-op).
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1') || 0,
  });
}

export { Sentry };
