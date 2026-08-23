/**
 * Self-ping interno para o plano free do Render: enquanto o processo esta
 * acordado, um GET periodico na URL publica /ready conta como trafego e
 * reinicia o idle (~15 min). Complementa o cron do GitHub Actions
 * (.github/workflows/keep-alive.yml), que cobre o caso em que o processo
 * ja dormiu.
 *
 * Importante: bate na URL publica (nao em localhost). Request so' para
 * 127.0.0.1 nao passa pelo proxy do Render e nao reseta o idle.
 */

import { logger } from './logger';

const keepAliveLogger = logger.child({ channel: 'keep-alive' });

const DEFAULT_INTERVAL_MS = 4 * 60 * 1000;
const PING_TIMEOUT_MS = 30_000;

export function isKeepAliveSelfPingEnabled(): boolean {
  const flag = process.env.KEEP_ALIVE_SELF_PING?.trim().toLowerCase();
  if (flag === 'false' || flag === '0') return false;
  if (flag === 'true' || flag === '1') return true;
  return process.env.NODE_ENV === 'production';
}

/**
 * Resolve a base URL publica, sem barra final.
 * Ordem: KEEP_ALIVE_URL > API_BASE_URL > PUBLIC_URL > RENDER_EXTERNAL_URL
 * (Render injeta RENDER_EXTERNAL_URL automaticamente nos web services).
 */
export function getKeepAlivePublicBaseUrl(): string | null {
  const candidates = [
    process.env.KEEP_ALIVE_URL,
    process.env.API_BASE_URL,
    process.env.PUBLIC_URL,
    process.env.RENDER_EXTERNAL_URL,
  ];

  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    return value.replace(/\/+$/, '');
  }

  return null;
}

export function getKeepAliveIntervalMs(): number {
  const raw = process.env.KEEP_ALIVE_INTERVAL_MS?.trim();
  if (!raw) return DEFAULT_INTERVAL_MS;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 60_000) {
    keepAliveLogger.warn('KEEP_ALIVE_INTERVAL_MS invalido; usando o padrao', {
      configured: raw,
      fallbackMs: DEFAULT_INTERVAL_MS,
    });
    return DEFAULT_INTERVAL_MS;
  }

  return value;
}

export async function pingKeepAliveUrl(url: string): Promise<void> {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(PING_TIMEOUT_MS),
  });

  if (!response.ok) {
    keepAliveLogger.warn('self-ping respondeu status inesperado', { url, status: response.status });
  }
}

export type KeepAliveSelfPingHandle = {
  stop: () => void;
};

/**
 * Inicia o intervalo se habilitado. Falhas de rede/HTTP so' geram warning.
 * Retorna null quando desligado ou sem URL publica configurada.
 */
export function startKeepAliveSelfPing(
  ping: (url: string) => Promise<void> = pingKeepAliveUrl,
): KeepAliveSelfPingHandle | null {
  if (!isKeepAliveSelfPingEnabled()) return null;

  const baseUrl = getKeepAlivePublicBaseUrl();
  if (!baseUrl) {
    keepAliveLogger.warn(
      'self-ping habilitado, mas nenhuma URL publica encontrada ' +
        '(KEEP_ALIVE_URL, API_BASE_URL, PUBLIC_URL ou RENDER_EXTERNAL_URL)',
    );
    return null;
  }

  const url = `${baseUrl}/ready`;
  const intervalMs = getKeepAliveIntervalMs();

  const run = () => {
    void ping(url).catch((error: unknown) => {
      keepAliveLogger.warn('self-ping falhou', { url, err: error });
    });
  };

  keepAliveLogger.info('self-ping ativo', { url, intervalMs });
  const timer = setInterval(run, intervalMs);
  // Nao impede o processo de encerrar quando o HTTP server fechar.
  timer.unref();

  return {
    stop: () => clearInterval(timer),
  };
}
