import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { getRequestContext, runWithRequestContext } from '../utils/requestContext';

// Aceita apenas um id "limpo" vindo do cliente/proxy: o valor entra no log e
// no header de resposta, entao caracteres de controle ou textos gigantes
// abririam espaco para poluir/forjar linhas de log.
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

// Rotas de liveness/readiness batem a cada poucos segundos (healthcheck do
// Docker, keep-alive do Render). Ficam em debug enquanto respondem 2xx.
const LOW_NOISE_PATHS = new Set(['/health', '/ready', '/api/v1/health', '/api/v1/ready']);

export function normalizeRequestId(value: unknown): string {
  return typeof value === 'string' && SAFE_REQUEST_ID.test(value) ? value : randomUUID();
}

function resolveLevel(status: number, path: string): 'debug' | 'info' | 'warn' | 'error' {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return LOW_NOISE_PATHS.has(path) ? 'debug' : 'info';
}

/**
 * Gera (ou reaproveita) um `x-request-id`, publica o contexto da requisicao no
 * AsyncLocalStorage e registra uma linha por requisicao concluida. Todo log
 * emitido durante a requisicao — inclusive de utilitarios sem acesso ao `req` —
 * sai correlacionado pelo mesmo requestId.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = normalizeRequestId(req.headers['x-request-id']);
  res.setHeader('X-Request-Id', requestId);

  runWithRequestContext({ requestId }, () => {
    const startedAt = process.hrtime.bigint();

    // 'close' sempre dispara, inclusive quando o cliente aborta no meio.
    res.once('close', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const path = req.originalUrl.split('?')[0] ?? req.originalUrl;
      const context = getRequestContext();

      logger[resolveLevel(res.statusCode, path)]('requisicao concluida', {
        method: req.method,
        path,
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(1)),
        ip: req.ip,
        userAgent: req.get('user-agent')?.slice(0, 200),
        ...(context?.adminId ? { adminId: context.adminId } : {}),
        ...(res.writableEnded ? {} : { aborted: true }),
      });
    });

    next();
  });
}
