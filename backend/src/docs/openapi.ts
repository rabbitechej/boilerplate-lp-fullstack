/**
 * OpenAPI 3.0 — documentação da API v1.
 * Servida em GET /api/docs (Swagger UI) e GET /api/docs.json.
 */
export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Boilerplate LP API',
    version: '1.0.0',
    description:
      'API REST do boilerplate (landing page + painel admin). ' +
      'Autenticação: access token Bearer + refresh cookie httpOnly. ' +
      'Listagens paginadas usam `page` e `limit` (padrão 20, máx. 100) e ' +
      'respondem `{ data: { items, page, limit, total, totalPages } }`.',
  },
  servers: [{ url: '/api/v1', description: 'API v1' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
            required: ['code', 'message'],
          },
        },
        required: ['error'],
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      Post: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          slug: { type: 'string' },
          excerpt: { type: 'string' },
          content: { type: 'string' },
          coverImageUrl: { type: 'string' },
          published: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Admin: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['admin'] },
          active: { type: 'boolean' },
        },
      },
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          adminId: { type: 'string' },
          adminEmail: { type: 'string' },
          adminName: { type: 'string' },
          action: { type: 'string' },
          resource: { type: 'string' },
          resourceId: { type: 'string' },
          status: { type: 'string', enum: ['success', 'failure'] },
          ip: { type: 'string' },
          userAgent: { type: 'string' },
          requestId: { type: 'string' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ContactMessage: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          message: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    parameters: {
      page: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      limit: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Liveness',
        responses: {
          '200': {
            description: 'Processo vivo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { type: 'object', properties: { status: { type: 'string' } } } },
                },
              },
            },
          },
        },
      },
    },
    '/ready': {
      get: {
        tags: ['System'],
        summary: 'Readiness (Mongo conectado)',
        responses: {
          '200': { description: 'Pronto' },
          '503': { description: 'Banco indisponível' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login do administrador',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Access token + admin; seta cookie de refresh' },
          '401': { description: 'Credenciais inválidas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Renova access token via cookie de refresh',
        responses: {
          '200': { description: 'Novo access token' },
          '401': { description: 'Sessão inválida' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Encerra sessão e limpa cookie',
        responses: { '200': { description: 'Logout ok' } },
      },
    },
    '/posts': {
      get: {
        tags: ['Posts'],
        summary: 'Lista posts publicados (paginado)',
        parameters: [
          { $ref: '#/components/parameters/page' },
          { $ref: '#/components/parameters/limit' },
        ],
        responses: { '200': { description: 'Lista paginada de posts públicos' } },
      },
    },
    '/posts/{slug}': {
      get: {
        tags: ['Posts'],
        summary: 'Detalhe de post publicado',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Post' },
          '404': { description: 'Não encontrado' },
        },
      },
    },
    '/admin/posts': {
      get: {
        tags: ['Admin Posts'],
        summary: 'Lista todos os posts (paginado)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/page' },
          { $ref: '#/components/parameters/limit' },
        ],
        responses: { '200': { description: 'Lista paginada' }, '401': { description: 'Não autenticado' } },
      },
      post: {
        tags: ['Admin Posts'],
        summary: 'Cria post',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Criado' }, '400': { description: 'Validação' } },
      },
    },
    '/admin/posts/{id}': {
      get: {
        tags: ['Admin Posts'],
        summary: 'Obtém post por id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Post' }, '404': { description: 'Não encontrado' } },
      },
      put: {
        tags: ['Admin Posts'],
        summary: 'Atualiza post',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Atualizado' } },
      },
      delete: {
        tags: ['Admin Posts'],
        summary: 'Exclui post (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Excluído' } },
      },
    },
    '/admin/audit-logs': {
      get: {
        tags: ['Admin'],
        summary: 'Logs de auditoria (admin, paginado e filtrável)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/page' },
          { $ref: '#/components/parameters/limit' },
          { name: 'action', in: 'query', schema: { type: 'string' }, example: 'login' },
          { name: 'resource', in: 'query', schema: { type: 'string' }, example: 'post' },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['success', 'failure'] },
          },
          { name: 'adminId', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          '200': { description: 'Lista paginada' },
          '400': { description: 'Filtro inválido' },
          '403': { description: 'Sem permissão' },
        },
      },
    },
    '/admin/contact-messages': {
      get: {
        tags: ['Admin'],
        summary: 'Mensagens de contato (admin, paginado)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/page' },
          { $ref: '#/components/parameters/limit' },
        ],
        responses: { '200': { description: 'Lista paginada' } },
      },
    },
    '/contact': {
      post: {
        tags: ['Contact'],
        summary: 'Envia mensagem de contato (pública, rate limited)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'message'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Recebida' },
          '400': { description: 'Validação' },
        },
      },
    },
  },
} as const;
