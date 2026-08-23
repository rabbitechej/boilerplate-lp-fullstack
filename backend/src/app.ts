import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { getCorsOrigins, getTrustProxy, isBlogEnabled } from './config/env';
import { isDatabaseReady } from './config/db';
import { Sentry } from './config/sentry';
import { rejectUnsafeMongoKeys, securityHeaders } from './middlewares/security';
import { requestLogger } from './middlewares/requestLogger';
import { toClientError } from './utils/httpErrors';
import { isValidationError } from './utils/mongoErrors';
import { logger } from './utils/logger';
import { getRequestContext } from './utils/requestContext';
import { mountApiDocs } from './docs/swagger';
import authRoutes from './routes/authRoutes';
import postRoutes from './routes/postRoutes';
import uploadRoutes from './routes/uploadRoutes';
import auditRoutes from './routes/auditRoutes';
import contactRoutes from './routes/contactRoutes';

type AppOptions = {
  corsOrigins?: string[];
};

export function createApp(options: AppOptions = {}) {
  const app = express();
  const allowedOrigins = options.corsOrigins ?? getCorsOrigins();

  app.disable('x-powered-by');
  app.set('trust proxy', getTrustProxy());
  // Antes de tudo: garante requestId e uma linha de log por requisicao,
  // inclusive para as que morrem no CORS ou no body parser.
  app.use(requestLogger);
  app.use(securityHeaders);
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origem nao autorizada pelo CORS'));
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  // No Express 5 o `req.body` fica UNDEFINED quando nao ha corpo JSON (POST sem
  // Content-Type, por exemplo) — e todo `const { x } = req.body` das rotas
  // lancaria TypeError, virando 500 numa requisicao que e' so' malformada.
  app.use((req, _res, next) => {
    if (req.body === undefined) req.body = {};
    next();
  });
  app.use(rejectUnsafeMongoKeys);

  const healthHandler: express.RequestHandler = (_req, res) => {
    res.json({ data: { message: 'API do boilerplate' } });
  };
  const livenessHandler: express.RequestHandler = (_req, res) => {
    res.json({ data: { status: 'ok' } });
  };
  const readinessHandler: express.RequestHandler = (_req, res) => {
    const ready = isDatabaseReady();
    res.status(ready ? 200 : 503).json({ data: { status: ready ? 'ready' : 'not_ready' } });
  };

  app.get('/', healthHandler);
  app.get('/health', livenessHandler);
  app.get('/ready', readinessHandler);

  mountApiDocs(app);

  const apiV1 = express.Router();
  apiV1.get('/', healthHandler);
  apiV1.get('/health', livenessHandler);
  apiV1.get('/ready', readinessHandler);
  apiV1.use(authRoutes);
  // Modulo opcional: com ENABLE_BLOG=false as rotas de posts nem existem.
  if (isBlogEnabled()) apiV1.use(postRoutes);
  apiV1.use(uploadRoutes);
  apiV1.use(auditRoutes);
  apiV1.use(contactRoutes);
  app.use('/api/v1', apiV1);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota nao encontrada.' } });
  });

  // Captura erros no Sentry antes do handler JSON (no-op se SENTRY_DSN ausente).
  Sentry.setupExpressErrorHandler(app);

  const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
    const isCorsError = error instanceof Error && error.message.includes('CORS');
    const requestId = getRequestContext()?.requestId;

    // Erro que o proprio middleware ja classificou como 4xx (JSON quebrado,
    // corpo grande demais): respeita o status e nao registra stack.
    const clientError = !isCorsError ? toClientError(error) : undefined;
    if (clientError) {
      logger.warn('requisicao malformada', {
        path: req.originalUrl.split('?')[0],
        status: clientError.status,
        code: clientError.code,
      });
      res.status(clientError.status).json({
        error: {
          code: clientError.code,
          message: clientError.message,
          ...(requestId ? { requestId } : {}),
        },
      });
      return;
    }

    // Payload que fere o schema e' erro do cliente: 400, e sem stack no log.
    if (!isCorsError && isValidationError(error)) {
      logger.warn('payload rejeitado pela validacao do schema', {
        path: req.originalUrl.split('?')[0],
        reason: error instanceof Error ? error.message : String(error),
      });
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'A requisicao contem campos invalidos.',
          ...(requestId ? { requestId } : {}),
        },
      });
      return;
    }

    if (isCorsError) {
      logger.warn('origem bloqueada pelo CORS', { origin: req.get('origin'), path: req.originalUrl });
    } else {
      logger.error('erro nao tratado na requisicao', {
        err: error,
        method: req.method,
        path: req.originalUrl.split('?')[0],
      });
    }

    res.status(isCorsError ? 403 : 500).json({
      error: {
        code: isCorsError ? 'CORS_FORBIDDEN' : 'INTERNAL_ERROR',
        message: isCorsError ? 'Origem nao autorizada.' : 'Erro interno no servidor.',
        // Devolvido para o usuario conseguir citar o id ao reportar o problema.
        ...(requestId ? { requestId } : {}),
      },
    });
  };
  app.use(errorHandler);

  return app;
}
