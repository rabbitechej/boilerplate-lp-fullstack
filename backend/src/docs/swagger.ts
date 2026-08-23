import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { isApiDocsEnabled, isBlogEnabled } from '../config/env';
import { logger } from '../utils/logger';
import { openApiDocument } from './openapi';

// Rotas que so' existem com o modulo de blog ligado. Documentar rota que
// responde 404 confunde quem consome a API.
const BLOG_PATHS = ['/posts', '/posts/{slug}', '/admin/posts', '/admin/posts/{id}'];

function buildDocument() {
  if (isBlogEnabled()) return openApiDocument;

  const paths = { ...openApiDocument.paths } as Record<string, unknown>;
  for (const path of BLOG_PATHS) delete paths[path];
  return { ...openApiDocument, paths };
}

/**
 * Monta Swagger UI em /api/docs e o JSON em /api/docs.json.
 * No-op quando a documentacao esta desligada (padrao em producao) — as duas
 * rotas caem no 404 padrao da API, sem revelar que a doc existe.
 */
export function mountApiDocs(app: Express): void {
  if (!isApiDocsEnabled()) {
    logger.info('documentacao da API desabilitada', { hint: 'defina ENABLE_API_DOCS=true para expor /api/docs' });
    return;
  }

  const document = buildDocument();

  app.get('/api/docs.json', (_req, res) => {
    res.json(document);
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(document, {
      customSiteTitle: 'Boilerplate LP API',
      swaggerOptions: { persistAuthorization: true },
    }),
  );
}
