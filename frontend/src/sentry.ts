import * as Sentry from '@sentry/react';

/**
 * Inicializa o Sentry no frontend se `VITE_SENTRY_DSN` estiver definido.
 * Variáveis VITE_* são embutidas no build — configure antes de `npm run build`.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT?.trim() || import.meta.env.MODE,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.1') || 0,
  });
}

export { Sentry };
