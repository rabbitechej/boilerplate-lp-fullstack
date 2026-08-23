import 'dotenv/config';
import { initSentry, Sentry } from './config/sentry';

initSentry();

import { createApp } from './app';
import { connectDatabase } from './config/db';
import { getLogFormat, getLogLevel, getPort, validateServerEnv } from './config/env';
import { startKeepAliveSelfPing } from './utils/keepAliveSelfPing';
import { logger } from './utils/logger';

// Erros fora do ciclo de requisicao morriam silenciosos: agora ficam no log
// (e no Sentry) antes de o processo cair.
process.on('unhandledRejection', (reason) => {
  logger.error('promise rejeitada sem tratamento', { err: reason });
});

process.on('uncaughtException', (error) => {
  logger.error('excecao nao capturada; encerrando processo', { err: error });
  void Sentry.close(2000).finally(() => process.exit(1));
});

async function main(): Promise<void> {
  validateServerEnv();
  await connectDatabase();

  const app = createApp();
  const port = getPort();
  const keepAlive = startKeepAliveSelfPing();
  const server = app.listen(port, () => {
    logger.info('API iniciada', {
      port,
      env: process.env.NODE_ENV ?? 'development',
      logLevel: getLogLevel(),
      logFormat: getLogFormat(),
    });
  });

  const shutdown = () => {
    logger.info('encerrando servidor');
    keepAlive?.stop();
    server.close(() => {
      void Sentry.close(2000).finally(() => process.exit(0));
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  logger.error('falha ao iniciar a API', { err: error });
  process.exit(1);
});
