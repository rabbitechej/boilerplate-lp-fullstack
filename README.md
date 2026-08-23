# Boilerplate LP + Backend Simples

Boilerplate para projetos do tipo **landing page com painel administrativo e backend simples**: frontend React (SPA) + backend Express/MongoDB, prontos para deploy gratuito em **Cloudflare** (frontend) e **Render** (backend).

Este boilerplate nasceu da extração dos padrões de arquitetura, segurança e organização de código usados em um projeto real (landing page + área administrativa + API com autenticação JWT), removendo o conteúdo de negócio específico e deixando uma base genérica e reutilizável.

---

## Índice

1. [Visão geral e filosofia](#1-visão-geral-e-filosofia)
2. [Arquitetura](#2-arquitetura)
3. [Estrutura de pastas](#3-estrutura-de-pastas)
4. [Padrões de código](#4-padrões-de-código)
5. [Pré-requisitos](#5-pré-requisitos)
6. [Como iniciar um novo projeto a partir deste boilerplate](#6-como-iniciar-um-novo-projeto-a-partir-deste-boilerplate)
7. [Configuração do ambiente local](#7-configuração-do-ambiente-local)
8. [Rodando localmente](#8-rodando-localmente)
9. [Fluxo de autenticação](#9-fluxo-de-autenticação)
10. [Tutorial: como adicionar um novo recurso](#10-tutorial-como-adicionar-um-novo-recurso)
11. [Testes](#11-testes)
12. [Build de produção](#12-build-de-produção)
13. [Deploy do backend no Render](#13-deploy-do-backend-no-render)
14. [Deploy do frontend no Cloudflare](#14-deploy-do-frontend-no-cloudflare)
15. [Conectando frontend e backend em produção](#15-conectando-frontend-e-backend-em-produção)
16. [Checklist de segurança pré-produção](#16-checklist-de-segurança-pré-produção)
17. [Troubleshooting comum](#17-troubleshooting-comum)
18. [Agentes de IA (`agentes/`)](#18-agentes-de-ia-agentes)

---

## 1. Visão geral e filosofia

**O que é:** um monorepo simples com duas pastas independentes — `frontend/` (React + Vite + TypeScript) e `backend/` (Express + TypeScript + MongoDB) — que juntas implementam:

- Uma landing page pública (Home, Sobre, Contato, lista de Conteúdos/Posts);
- Um painel administrativo protegido por login (CRUD de Posts, upload de imagens, log de auditoria filtrável);
- Uma API REST com autenticação JWT robusta (access token + refresh token rotativo, sessões persistidas no banco, revogação automática em caso de reuso de token).

**Quando usar este boilerplate:**
- Sites institucionais, páginas de divulgação, portfólios com um "blog" simples e um painel para o cliente editar conteúdo sem precisar de você;
- Projetos pequenos/médios que precisam de autenticação real (não só um formulário estático) mas não justificam um CMS completo (WordPress, Strapi etc.);
- Quando o objetivo é ter uma base sólida de segurança (JWT, rate limit, headers, validação) sem reinventar a roda em cada projeto novo.

**Quando NÃO usar:**
- Aplicações com lógica de negócio complexa, múltiplos tipos de usuário com permissões refinadas, ou alto tráfego — este boilerplate é deliberadamente simples;
- Se você precisa de SSR/SEO avançado, considere Next.js/Astro em vez de uma SPA pura;
- Se você já tem um CMS headless contratado (Sanity, Contentful), o backend aqui é redundante.

---

## 2. Arquitetura

```
                         HTTPS                         HTTPS
   [ Navegador ]  ───────────────▶  [ Cloudflare Workers ]
                                     (frontend estático,
                                      SPA React buildada)
                                            │
                                            │ fetch para VITE_API_URL
                                            │ (CORS + cookies httpOnly)
                                            ▼
                                     [ Render Web Service ]
                                     (API Express/Node)
                                            │
                              ┌─────────────┴─────────────┐
                              ▼                           ▼
                     [ MongoDB Atlas ]           [ Cloudinary ]
                     (dados: posts, admins,       (armazenamento
                      sessões, audit log,          de imagens)
                      mensagens de contato)
```

- **Frontend**: SPA React 19 + Vite, sem framework de rotas externo (router próprio baseado em `pathname`), publicada como *assets estáticos* no Cloudflare Workers (via Wrangler). Fala com a API só por HTTP/JSON.
- **Backend**: API REST Express 5, sem views server-side, validação manual (sem ORM "mágico" além do Mongoose), autenticação por JWT + sessão em banco. Publicado no Render como *Web Service* Node.
- **Banco de dados**: MongoDB (recomendado: cluster gratuito MongoDB Atlas — o Render não fornece banco gerenciado gratuito).
- **Mídia**: Cloudinary (upload de imagens para o painel administrativo), porque o Render free tier tem sistema de arquivos efêmero (não persiste uploads locais entre deploys/restarts).

### Dependências com versão

**Backend** (`backend/package.json`) — Node `>= 20.19.0`:

| Dependência | Versão | Para quê |
|---|---|---|
| `express` | ^5.2.1 | Servidor HTTP / API REST |
| `mongoose` | ^9.7.1 | ODM MongoDB |
| `jsonwebtoken` | ^9.0.3 | Access token JWT |
| `bcrypt` | ^6.0.0 | Hash de senha/refresh token |
| `cloudinary` | ^2.10.0 | Upload de imagens |
| `multer` | ^2.2.0 | Parse de upload multipart |
| `cors` | ^2.8.6 | CORS configurável |
| `dotenv` | ^17.4.2 | Carrega `.env` em dev |
| `swagger-ui-express` | ^5.0.1 | Docs OpenAPI (`/api/docs`, fora de produção) |
| `@sentry/node` | ^10.70.0 | Observabilidade opcional (`SENTRY_DSN`) |

Dev: `typescript` ^6.0.3, `tsx` ^4.22.4, `eslint` ^9.18.0 + `typescript-eslint` (flat config), `mongodb-memory-server` para integração. Sem framework de teste externo — `node:test` nativo.

**Frontend** (`frontend/package.json`):

| Dependência | Versão | Para quê |
|---|---|---|
| `react` / `react-dom` | ^19.1.0 | UI |
| `@sentry/react` | ^10.70.0 | Observabilidade opcional (`VITE_SENTRY_DSN`) |
| `vite` | ^6.0.11 | Build/dev server |
| `vitest` | ^3.2.6 | Testes unitários |
| `@playwright/test` | ^1.62.1 | Testes e2e (`npm run test:e2e`) |
| `typescript` | ^5.8.3 | Tipagem |

Sem router externo (router próprio, seção 3) e sem lib de UI (design próprio em CSS). Versões exatas (incl. transitivos) ficam travadas nos `package-lock.json`; para ver o que está desatualizado, `npm outdated` em cada pasta.

---

## 3. Estrutura de pastas

```
boilerplate-lp-fullstack/
├── package.json              # scripts de orquestração (dev:full, build, test, lint)
├── .github/workflows/ci.yml   # CI: typecheck/test/lint/build dos dois pacotes a cada push/PR
├── .github/workflows/keep-alive.yml  # cron a cada 5 min: GET /ready no Render (anti-idle)
├── .nvmrc                      # versao do Node usada (mesma do engines.node do backend)
├── LICENSE                      # MIT — edite o titular do copyright
├── agentes/                      # instruções para assistentes de IA (opcional — seção 18)
├── frontend/                  # SPA React + Vite + TypeScript
│   ├── wrangler.jsonc         # configuração de deploy no Cloudflare
│   ├── src/
│   │   ├── routing.ts         # router próprio (pathname → AppRoute)
│   │   ├── navigation.ts       # navigate() — pushState + popstate, sem reload completo
│   │   ├── api/                # cliente HTTP (client.ts) e chamadas (admin.ts)
│   │   ├── components/         # componentes compartilhados (Layout, Brand, ErrorBoundary)
│   │   ├── pages/               # páginas públicas (Home, Sobre, Contato, Posts)
│   │   ├── admin/                # páginas do painel (Login, Posts, Imagens, Auditoria, Mensagens)
│   │   ├── context/                # AuthContext (estado de login em memória)
│   │   ├── lib/                     # integrações de terceiros no browser (web3forms.ts)
│   │   ├── utils/                    # helpers puros do frontend (slugify)
│   │   └── hooks/                   # hooks compartilhados (useReveal)
│   ├── e2e/                     # Playwright (login + CRUD de Post)
│   └── ...
└── backend/                    # API Express + TypeScript + MongoDB
    ├── render.yaml             # configuração de deploy no Render (Blueprint)
    └── src/
        ├── server.ts           # ponto de entrada (conecta DB, sobe o Express, keep-alive, Sentry)
        ├── app.ts               # criação do app Express (middlewares, rotas, /health, /ready, /api/docs)
        ├── docs/                 # OpenAPI + Swagger UI
        ├── config/               # env, Mongo, Sentry
        ├── auth/                  # geração/verificação de JWT, sessões de refresh token
        ├── middlewares/            # auth, segurança, rate limit, upload, requestLogger
        ├── models/                  # schemas Mongoose (Admin, Post, AuthSession, AuditLog, RateLimit, ContactMessage)
        ├── routes/                   # rotas HTTP por recurso
        ├── dto/                        # funções de serialização Model → DTO
        ├── utils/                       # logger, requestContext, audit, validação, paginação, keepAliveSelfPing, erros Mongo
        ├── integration/                  # testes de integração (mongodb-memory-server)
        └── scripts/                      # createAdmin.ts, seed.ts (rodados via npm run)
```

Cada arquivo `*.test.ts` fica **ao lado** do arquivo que testa (não em uma pasta `__tests__` separada) — facilita encontrar o teste de qualquer módulo.

---

## 4. Padrões de código

### 4.1 Nomenclatura

- **Identificadores de código** (variáveis, funções, tipos, nomes de arquivo) → **inglês**.
- **Mensagens voltadas ao usuário final** (erros de validação, textos de UI, logs de negócio) → **português**.
- Arquivos de componente React: `PascalCase.tsx`. Demais arquivos TypeScript: `camelCase.ts`.
- Nomes de rotas HTTP: sempre no plural e em inglês (`/posts`, `/admin/posts`, `/auth/login`).

### 4.2 Contrato de resposta da API

Toda resposta da API segue um envelope único:

**Sucesso:**
```json
{ "data": { "id": "abc123", "title": "Meu post" } }
```

**Erro:**
```json
{ "error": { "code": "INVALID_INPUT", "message": "Informe titulo, slug e conteudo validos." } }
```

Isso vale para **todos** os status HTTP (200, 201, 400, 401, 403, 404, 429, 500) — nunca retorne um corpo "solto" sem `data` ou `error`. O cliente HTTP do frontend (`frontend/src/api/client.ts`) já assume esse contrato e lança `ApiError` quando o `error.code`/`error.message` vêm preenchidos.

**Listagens paginadas** (`GET /posts`, `/admin/posts`, `/admin/audit-logs`, `/admin/contact-messages`) usam query `page` (padrão 1) e `limit` (padrão 20, máx. 100) e respondem:

```json
{
  "data": {
    "items": [ /* ... */ ],
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

Erros de requisição malformada têm código próprio: `INVALID_JSON` (corpo não é JSON válido, 400), `PAYLOAD_TOO_LARGE` (acima de 1MB, 413) e `INVALID_INPUT` (validação, 400). Nenhum deles vira 500 — se você vir `INTERNAL_ERROR` no log, é bug de verdade, não cliente malformado.

Documentação interativa (Swagger UI): `http://localhost:5000/api/docs` (JSON em `/api/docs.json`). Em `NODE_ENV=production` as duas rotas **não são montadas** (caem no 404 padrão) — ligue com `ENABLE_API_DOCS=true` se precisar.

### 4.3 Camadas do backend

```
request → middleware (auth/segurança/rate limit) → route handler → model (Mongoose) → dto (serialização) → response
```

- **Models** (`models/`): apenas schema e tipos. Sem lógica de negócio.
- **DTOs** (`dto/`): toda serialização Model → JSON público passa por uma função `toXDto`. Nunca devolva um documento Mongoose direto na resposta (evita expor campos internos como `passwordHash`, `refreshTokenHash`).
- **Routes** (`routes/`): validação de entrada + orquestração. Lógica simples pode morar aqui; lógica reutilizável vai para `utils/` ou `auth/`.
- **Middlewares** (`middlewares/`): tudo que é transversal a várias rotas (autenticação, segurança, rate limit).

### 4.4 ESLint e Prettier

Ambos os pacotes (`frontend/` e `backend/`) têm `eslint.config.js` (flat config, `typescript-eslint`) e compartilham o `.prettierrc` da raiz.

```bash
npm run lint        # na raiz, roda lint do backend e do frontend
npm run lint --prefix backend     # só o backend
npm run lint --prefix frontend    # só o frontend
npx prettier --write .             # formata um pacote (rode dentro de frontend/ ou backend/)
```

Regra geral: **corrija o lint antes de abrir PR**. Não desabilite regras no código (`eslint-disable`) sem justificar em comentário.

### 4.5 Padrão de testes

- Backend: `node:test` nativo + `tsx` (sem Jest/Vitest — zero dependências extras de teste).
- Frontend: `vitest`.
- Convenção **Arrange-Act-Assert**, com `describe` nomeando a unidade testada e `it` descrevendo o comportamento esperado em português, em frase afirmativa:

```ts
describe('isValidEmail', () => {
  it('aceita email valido', () => { /* ... */ });
  it('rejeita email invalido', () => { /* ... */ });
});
```

### 4.6 Convenção de commits (Conventional Commits)

Todos os commits seguem [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo opcional>): <descrição curta no imperativo>

<corpo opcional explicando o porquê>
```

Tipos usados neste boilerplate:

| Tipo       | Quando usar                                                         |
|------------|----------------------------------------------------------------------|
| `feat`     | nova funcionalidade visível (rota nova, página nova, campo novo)     |
| `fix`      | correção de bug                                                      |
| `chore`    | tarefa de manutenção sem impacto em código de produção (deps, config)|
| `refactor` | mudança de estrutura interna sem alterar comportamento               |
| `test`     | adição ou ajuste de testes, sem mudar código de produção             |
| `docs`     | mudanças só em documentação (README, comentários)                    |
| `style`    | formatação, espaçamento, ponto e vírgula — sem mudança de lógica     |
| `perf`     | melhoria de performance                                              |

Exemplos:

```
feat(backend): adiciona rota de criação de Testimonial
fix(frontend): corrige loop de refresh quando access token expira
chore: atualiza dependencias do backend
test(backend): cobre rotacao de refresh token com deteccao de reuso
docs: explica fluxo de deploy no Render
```

**Escopo** é opcional, mas recomendado quando a mudança é claramente de um lado só (`frontend`, `backend`, ou o nome do recurso: `posts`, `auth`).

### 4.7 Um commit por task

Trabalhe **task por task**, e feche cada task com **exatamente um commit** (ou, no máximo, um commit por etapa logicamente indivisível da task). Isso significa:

1. Antes de codar, tenha a task escrita (um item de TODO, um card de board, uma linha de checklist no PR) — uma frase que descreva *o que* deve mudar e *por quê*.
2. Implemente **só** o que aquela task pede. Se notar algo extra que precisa de mudança, anote como uma nova task — não misture no mesmo commit.
3. Rode `npm run typecheck && npm test && npm run lint` (na raiz ou no pacote afetado) **antes** de commitar.
4. Crie o commit com `git add <arquivos da task>` (evite `git add -A` indiscriminado) e uma mensagem Conventional Commits que descreva exatamente essa task.
5. Passe para a próxima task com um novo commit.

Vantagens práticas desse esquema:
- `git log` se torna um changelog legível — cada linha é uma unidade de trabalho compreensível isoladamente;
- `git revert <hash>` desfaz exatamente uma task, sem efeitos colaterais em outras;
- Code review fica mais fácil: revisar commit por commit em vez de um diff gigante;
- `git bisect` localiza regressões rapidamente, porque cada commit é testável isoladamente (por isso o passo 3 — *nunca* commite com testes/typecheck quebrados).

Evite: commits "wip", "ajustes", "varias coisas" — se a mensagem não cabe no padrão `tipo: descrição`, é sinal de que a task era grande demais e deveria ter sido quebrada em mais de uma.

### 4.8 Fluxo de branches e Pull Requests

O código anda em uma direção só: **pessoa → `develop` → `main`**. Ninguém commita direto em `develop` nem em `main`.

```
feat/nome-da-task ──PR──▶ develop ──PR──▶ main ──▶ produção
   (uma pessoa)            (integração)      (release)
```

| Branch | O que é | Quem escreve |
|---|---|---|
| `main` | o que está (ou pode ir) em produção. Sempre verde, sempre deployável | ninguém direto — só merge de PR vindo de `develop` |
| `develop` | integração: onde as tasks de todo mundo se encontram antes do release | ninguém direto — só merge de PR vindo de branch de task |
| `feat/…`, `fix/…`, `chore/…` | a task de uma pessoa. Curta, some depois do merge | a pessoa dona da task |

**Nome da branch:** mesmo tipo do commit + descrição em kebab-case — `feat/filtro-audit-log`, `fix/refresh-token-loop`, `chore/atualiza-deps`. Prefixe com o número da issue se o board usa (`feat/42-filtro-audit-log`).

**Ciclo de uma task:**

```bash
git switch develop && git pull                 # sempre parta do develop atualizado
git switch -c feat/filtro-audit-log

# ... trabalha, seguindo 4.6 (mensagem) e 4.7 (um commit por task) ...
npm run typecheck && npm test && npm run lint  # antes de empurrar

git push -u origin feat/filtro-audit-log       # abre o PR para develop
```

**PR de task → `develop`:**

- título no mesmo formato do commit (`feat(backend): filtra audit log por período`);
- descrição responde **o quê** e **por quê** — o *como* está no diff;
- CI verde é obrigatório (typecheck, testes, lint, build nos dois pacotes);
- pelo menos uma revisão de outra pessoa;
- **merge por squash**: a branch vira um commit em `develop`. Assim o passo "um commit por task" (4.7) sobrevive à integração e `git revert` continua desfazendo uma task inteira;
- apague a branch depois do merge.

**PR de release `develop` → `main`:**

- é onde se decide *quando* entrega, não *o que* entrega — o conteúdo já foi revisado nos PRs anteriores;
- **merge commit** (não squash): preserva no histórico de `main` os commits de cada task que entraram no release;
- valide em staging/preview antes, e rode o checklist da seção 15 depois do deploy;
- opcional: marque a release (`git tag -a v1.2.0 -m "..."`) para conseguir voltar a um ponto conhecido.

**Configure a proteção no GitHub** (Settings → Branches), senão nada disso é regra, é só combinado: exija PR para `main` e `develop`, exija o CI passando, exija ao menos 1 aprovação, e bloqueie push direto e force-push.

**Correção urgente em produção:** saia de `main` (`fix/hotfix-…`), abra PR para `main` e, depois do merge, **traga de volta para `develop`** (PR ou `git merge main`). Esquecer esse retorno é o jeito clássico de a correção sumir no próximo release.

> Se o projeto for de uma pessoa só, `develop` pode parecer burocracia — mas é ela que mantém `main` sempre deployável quando o cliente pede um ajuste no meio de uma feature pela metade.

### 4.9 Logs e auditoria

O boilerplate tem **dois** registros, com propósitos diferentes:

| | Log de aplicação | Audit log |
|---|---|---|
| Onde vive | `stdout`/`stderr` do processo (Render, `docker logs`) | coleção `auditlogs` no Mongo |
| Para que serve | diagnosticar o que a API fez e por que falhou | responder "quem fez o quê, quando e de onde" |
| Quem lê | você, durante um incidente | você e o cliente, pelo painel `/admin/auditoria` |
| Retenção | a do provedor (curta) | até você apagar |

**Log de aplicação** (`backend/src/utils/logger.ts`):

```ts
import { logger } from '../utils/logger';

logger.info('post publicado', { slug: post.slug });
logger.error('falha ao publicar', { err: error });     // `err` vira { name, message, stack }

const authLogger = logger.child({ channel: 'auth' });  // campos fixos em todas as linhas
```

- **Formato**: `pretty` no terminal, `json` em produção (`LOG_FORMAT`), uma linha por evento.
- **Nível**: `LOG_LEVEL` (`debug` fora de produção, `info` em produção, `silent` nos testes).
- **Correlação**: cada requisição ganha um `requestId` (`middlewares/requestLogger.ts`) publicado num `AsyncLocalStorage`. Todo log emitido durante a requisição sai com esse id — **inclusive** o de utilitários que não recebem `req`. O id volta no header `X-Request-Id` e, em erro 500, também no corpo (`error.requestId`), então o usuário consegue citá-lo ao reportar o problema.
- **Segurança**: chaves que parecem segredo (`password`, `senha`, `token`, `secret`, `authorization`, `cookie`, `api_key`) são mascaradas em qualquer profundidade; strings, arrays e objetos gigantes são truncados e ciclos viram `[Circular]`.
- **Privacidade**: a linha de cada requisição inclui IP e user-agent — dado pessoal sob a LGPD. É proposital (sem isso não se investiga abuso), mas trate a retenção de logs como trata a de dados: use o prazo do provedor, não exporte para lugar nenhum sem necessidade, e mencione na política de privacidade se ela detalha logs de acesso.
- **Ruído**: `/health` e `/ready` só aparecem em `debug` enquanto respondem 2xx — o healthcheck do Docker e o keep-alive do Render batem neles o tempo todo.

Achar tudo de uma requisição nos logs do Render:

```bash
# no dashboard do Render, ou com os logs baixados:
grep '"requestId":"<id-do-header>"' logs.json
```

**Audit log** (`backend/src/utils/audit.ts`): registra ações administrativas em duas vias — sempre no stream de logs (`channel: audit`) e, quando o banco responde, na coleção `auditlogs`. Nunca lança: auditoria não pode derrubar a operação auditada.

```ts
await recordAuditLog(req, {
  action: 'update',
  resource: 'post',
  resourceId: String(post._id),
  metadata: { fields: Object.keys(req.body) },
});
```

Do `req` saem sozinhos ator (id, e-mail e nome, **desnormalizados** para o registro sobreviver à remoção da conta), IP, user-agent e `requestId`. Eventos já cobertos: `login` (sucesso **e** falha, com o motivo), `logout`, `refresh` com falha (cobre reuso de refresh token), e `create`/`update`/`delete` de post e `upload` de imagem.

A tela `/admin/auditoria` filtra por ação, recurso, resultado (`sucesso`/`falha`) e período. Os filtros são validados no backend contra formatos conhecidos (`buildAuditLogFilter`) — nada do que o cliente manda vira operador de query.

> A coleção `auditlogs` cresce indefinidamente por design (histórico não se apaga sozinho). Se o volume incomodar, adicione um TTL ou um export periódico — veja a seção 19.

### 4.10 Módulos opcionais (feature flags)

Nem todo projeto que nasce deste boilerplate precisa de tudo. Um módulo desligado **não é removido do código** — as rotas simplesmente não são montadas e a UI não mostra os links. Isso mantém o desligamento reversível e sem conflito na hora de puxar melhorias do boilerplate.

| Módulo | Backend | Frontend | Padrão |
|---|---|---|---|
| Blog / conteúdos | `ENABLE_BLOG` | `VITE_ENABLE_BLOG` | ligado |
| Documentação da API | `ENABLE_API_DOCS` | — | ligado fora de produção |

**As duas pontas precisam casar.** Desligar só no backend deixa o menu com um link que responde 404; desligar só no frontend deixa a API servindo dados que ninguém consome. No Docker, `ENABLE_BLOG` do `.env` alimenta os dois (o frontend recebe como build-arg, então exige `docker compose build frontend` depois de mudar).

Com `ENABLE_BLOG=false`:

- backend: `/posts`, `/posts/:slug`, `/admin/posts*` não são montadas (404 padrão) e somem do Swagger; `npm run seed` avisa e não faz nada;
- frontend: `/conteudos*` e `/admin/conteudos*` caem em "página não encontrada" e os links somem do menu público e do painel;
- o model `Post` e os dados já gravados continuam intactos — religar é trocar a variável e rebuildar.

**Para criar uma flag nova**, siga o mesmo par: uma função em `backend/src/config/env.ts` (padrão *ligado*, para quem atualiza o boilerplate não perder funcionalidade sem perceber), uma entrada em `features` no `frontend/src/config/features.ts`, e o `if` no ponto de montagem — rota no `app.ts`, link no componente. Não espalhe a checagem por dentro das rotas: montar ou não montar é mais simples de auditar do que um `if` em cada handler.

---

## 5. Pré-requisitos

- **Node.js** `>= 20.19.0` (definido em `backend/package.json` → `engines.node`) — confira com `node -v`;
- **npm** (vem com o Node; não há suporte testado para `yarn`/`pnpm`, embora provavelmente funcionem);
- **Git**;
- Conta gratuita em **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)** (banco de dados);
- Conta gratuita em **[Cloudinary](https://cloudinary.com/users/register/free)** (upload de imagens);
- Conta gratuita em **[Render](https://dashboard.render.com/register)** (deploy do backend);
- Conta gratuita em **[Cloudflare](https://dash.cloudflare.com/sign-up)** (deploy do frontend).

---

## 6. Como iniciar um novo projeto a partir deste boilerplate

1. Copie a pasta inteira para o novo destino (não use `git clone` deste boilerplate como submódulo — copie e desvincule):
   ```bash
   cp -r boilerplate-lp-fullstack meu-novo-projeto
   cd meu-novo-projeto
   rm -rf .git
   git init
   ```
2. Renomeie os identificadores do projeto:
   - `package.json` (raiz, `frontend/`, `backend/`) → campo `"name"`;
   - `frontend/wrangler.jsonc` → campo `"name"` (vira o subdomínio `*.workers.dev`);
   - `backend/render.yaml` → campo `name` do serviço;
   - `backend/src/config/env.ts` → valores padrão de `getJwtIssuer()`/`getJwtAudience()` (ou apenas defina `JWT_ISSUER`/`JWT_AUDIENCE` no `.env`, sem precisar editar código);
   - `backend/src/auth/tokens.ts` → constante `REFRESH_COOKIE_NAME`, se quiser um nome de cookie específico do seu projeto.
3. Troque a marca no frontend: `frontend/src/components/Brand.tsx` e o `<title>` em `frontend/index.html`.
4. Apague o conteúdo de exemplo que não fizer sentido (ex.: ajuste os textos de `HomePage.tsx`/`AboutPage.tsx`).
5. Se for usar assistente de código, instale os agentes uma vez (opcional — veja a seção [18](#18-agentes-de-ia-agentes)):
   ```bash
   ./agentes/instalar.sh
   ```
6. Siga a seção [7. Configuração do ambiente local](#7-configuração-do-ambiente-local) normalmente.

---

## 7. Configuração do ambiente local

### 7.1 Instalar dependências

```bash
npm run install:all
# equivalente a:
#   npm install --prefix frontend
#   npm install --prefix backend
```

### 7.2 Criar os arquivos `.env`

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 7.3 Variáveis do backend (`backend/.env`)

| Variável                     | Obrigatória | Descrição                                                                                 |
|-------------------------------|:---:|---------------------------------------------------------------------------------------------|
| `PORT`                        | não | Porta HTTP local da API. Padrão `5000`.                                                     |
| `NODE_ENV`                    | não | `development` localmente; `production` é definido automaticamente pelo Render.              |
| `CORS_ORIGINS`                | sim em produção | Lista de origens permitidas, separadas por vírgula (ex.: `https://meusite.com,https://www.meusite.com`). Em dev, se vazio, libera `http://localhost:5173`. |
| `TRUST_PROXY`                 | não | `0`/`false` desliga; `true` confia em 1 hop; ou um número de hops. No Render, use `1`.       |
| `MONGODB_URI`                  | **sim** | String de conexão do MongoDB Atlas (veja seção 7.5).                                       |
| `JWT_SECRET`                    | **sim** | Segredo para assinar os access tokens. **Mínimo 32 caracteres** (validado em runtime). Gere com `openssl rand -base64 48`. |
| `JWT_ISSUER`                     | não | Claim `iss` do JWT. Qualquer string identificando sua API.                                  |
| `JWT_AUDIENCE`                    | não | Claim `aud` do JWT. Qualquer string identificando o consumidor (seu painel admin).            |
| `ACCESS_TOKEN_TTL_MINUTES`         | não | Duração do access token. Padrão `15` minutos.                                               |
| `REFRESH_TOKEN_TTL_DAYS`            | não | Duração máxima da sessão de refresh. Padrão `7` dias.                                        |
| `SESSION_IDLE_TTL_MINUTES`           | não | Tempo de inatividade até a sessão expirar, mesmo dentro do TTL acima. Padrão `60` minutos.    |
| `AUTH_COOKIE_SECURE`                  | sim em produção | `true` exige HTTPS para o cookie de refresh. **Deve ser `true` em produção** (validado em runtime). |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | só para `admin:create` | Dados do primeiro administrador, usados apenas pelo script `npm run admin:create`. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | **sim** | Credenciais do Cloudinary (veja seção 7.6). |
| `KEEP_ALIVE_SELF_PING` | não | `true`/`false` força liga/desliga o self-ping. Em `production` liga sozinho; em local fica desligado. |
| `KEEP_ALIVE_URL` / `API_BASE_URL` / `PUBLIC_URL` | não | URL pública da API (sem barra final). Prioridade nessa ordem; no Render, `RENDER_EXTERNAL_URL` já é injetado e serve de fallback. |
| `KEEP_ALIVE_INTERVAL_MS` | não | Intervalo do self-ping em ms. Padrão `240000` (4 min); mínimo `60000`. |
| `SENTRY_DSN` | não | Se definido, envia erros do backend ao Sentry. Sem DSN, o Sentry fica desligado. |
| `SENTRY_ENVIRONMENT` | não | Ambiente reportado ao Sentry (padrão: `NODE_ENV`). |
| `SENTRY_TRACES_SAMPLE_RATE` | não | Sample rate de traces (padrão `0.1`). |
| `LOG_LEVEL` | não | `debug` \| `info` \| `warn` \| `error` \| `silent`. Padrão: `debug` fora de produção, `info` em produção, `silent` nos testes. |
| `LOG_FORMAT` | não | `json` (uma linha por evento, para agregadores) ou `pretty` (legível no terminal). Padrão: `json` em produção, `pretty` fora dela. |
| `ENABLE_API_DOCS` | não | Força ligar/desligar o Swagger UI em `/api/docs`. Padrão: ligado fora de produção, **desligado em produção**. |
| `ENABLE_BLOG` | não | `false` desmonta as rotas de posts (públicas e do painel). Padrão: ligado. Precisa casar com `VITE_ENABLE_BLOG` (seção 4.10). |

### 7.4 Variáveis do frontend (`frontend/.env`)

| Variável         | Descrição                                                                                   |
|-------------------|-----------------------------------------------------------------------------------------------|
| `VITE_API_URL`     | URL base da API, **incluindo** o prefixo `/api/v1` (ex.: `http://localhost:5000/api/v1` em dev, `https://sua-api.onrender.com/api/v1` em produção). |
| `VITE_SENTRY_DSN`  | Opcional. Se definido, inicializa o Sentry no frontend (embutido no **build**). |
| `VITE_SENTRY_ENVIRONMENT` | Opcional. Ambiente reportado ao Sentry (padrão: `MODE` do Vite). |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Opcional. Sample rate de traces (padrão `0.1`). |
| `VITE_ENABLE_BLOG` | Opcional. `false` esconde as páginas de conteúdo e os links do menu. Precisa casar com `ENABLE_BLOG` do backend (seção 4.10). |
| `VITE_WEB3FORMS_ACCESS_KEY` | Opcional. Access key do Web3Forms para notificar a equipe por e-mail quando chega uma mensagem de contato (veja seção 7.8). Sem ela o formulário continua funcionando — só o e-mail deixa de sair. |

> Variáveis `VITE_*` são embutidas no JavaScript no momento do **build** (`npm run build`), não em runtime. Se você mudar `VITE_API_URL`, precisa rodar o build de novo antes de fazer deploy.

### 7.5 Criando um cluster gratuito no MongoDB Atlas

1. Crie uma conta em https://www.mongodb.com/cloud/atlas/register.
2. No painel, clique em **"Build a Database"** → escolha o plano **M0 (Free)**.
3. Escolha um provedor/região (qualquer um, o free tier é igual em todos).
4. Em **"Security" → "Database Access"**, crie um usuário de banco (usuário/senha — **não confunda com a conta da Atlas**).
5. Em **"Security" → "Network Access"**, libere o IP necessário:
   - Para desenvolvimento local: adicione seu IP atual (botão "Add Current IP Address");
   - Para produção no Render: como o Render usa IPs dinâmicos no plano free, adicione `0.0.0.0/0` (libera de qualquer IP) — restrinja por usuário/senha forte e mantenha o `MONGODB_URI` em segredo.
6. Em **"Database" → "Connect"**, copie a *connection string* no formato `mongodb+srv://usuario:senha@cluster.../`. Substitua `usuario`/`senha` pelos criados no passo 4 e adicione o nome do banco antes do `?` (ex.: `.../meu-projeto?retryWrites=true&w=majority`).
7. Cole essa string em `MONGODB_URI` no `.env`.

### 7.6 Criando uma conta no Cloudinary

1. Crie uma conta gratuita em https://cloudinary.com/users/register/free.
2. No **Dashboard**, a tela inicial já mostra as 3 credenciais necessárias: **Cloud Name**, **API Key**, **API Secret**.
3. Copie cada uma para `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` no `.env`.

### 7.7 Gerando um `JWT_SECRET` forte

```bash
openssl rand -base64 48
```

Cole o resultado em `JWT_SECRET`. Nunca reutilize o mesmo segredo entre ambientes (dev/produção) ou entre projetos diferentes.

### 7.8 Web3Forms (notificação por e-mail do formulário de contato)

Opcional. Sem configurar nada, o formulário de contato continua funcionando — a mensagem é salva no Mongo e aparece em `/admin/mensagens`. Com o Web3Forms, a equipe **também** recebe um e-mail na hora.

**Como funciona:** o backend salva primeiro (fonte da verdade); só depois o frontend dispara o e-mail direto do browser, em fire-and-forget:

```
[Usuário] → POST /contact (backend salva) → 201
                ↓
      void notifyContactMessage(...).catch(...)   ← falha aqui não vira erro na tela
                ↓
      POST https://api.web3forms.com/submit → e-mail para a caixa do painel Web3Forms
```

**Por que no browser e não no servidor:** no plano free do Web3Forms, chamada server-side costuma voltar `403`. A access key é **pública por design** (o Vite embute `VITE_*` no bundle) — não trate como segredo de runtime.

**Configurando:**

1. Crie o formulário em https://web3forms.com e copie a **Access Key**;
2. Ative **domain lock** para o seu domínio de produção e ajuste o rate limit no painel deles — é isso que protege a key pública;
3. Confirme o e-mail de destino;
4. Defina `VITE_WEB3FORMS_ACCESS_KEY` em `frontend/.env` (local) e no **build** de produção:
   - GitHub Actions: **Settings → Environments → production → Variables** (Variable, não Secret) — o `ci.yml` já repassa a var no step de build;
   - Docker: `VITE_WEB3FORMS_ACCESS_KEY` no `.env` do compose (chega como build-arg, então exige `docker compose build frontend` de novo quando muda);
   - Cloudflare: defina a variável no ambiente de build antes do `npm run build`.

**Novos formulários:** duplique `notifyContactMessage` em `frontend/src/lib/web3forms.ts` ajustando assunto e campos, e chame **depois** do POST que persiste, sempre com `void ... .catch(...)`.

**Se você adicionar CSP** ao servir o frontend (o `nginx.conf` deste boilerplate não define uma), inclua `https://api.web3forms.com` em `connect-src` — sem isso o browser bloqueia o fetch e a notificação falha em silêncio.

**LGPD:** se a sua política de privacidade lista compartilhamento de dados, mencione o Web3Forms como destinatário das notificações internas. Anexos (se você adicionar algum) devem ficar só no painel admin — não os envie para o Web3Forms.

---

## 8. Rodando localmente

### 8.1 Subir tudo de uma vez

```bash
npm run dev:full
```

Isso sobe a API (`http://localhost:5000`) e o frontend (`http://localhost:5173`) simultaneamente, com logs coloridos por processo (`api` em ciano, `web` em verde).

### 8.2 Subir separadamente

```bash
npm run dev --prefix backend     # API em http://localhost:5000
                                 # Swagger UI: http://localhost:5000/api/docs
npm run dev --prefix frontend    # Frontend em http://localhost:5173
```

### 8.3 Criar o primeiro administrador

Preencha `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (senha com 8+ caracteres) em `backend/.env` e rode:

```bash
npm run admin:create --prefix backend
```

### 8.4 Popular dados de exemplo

```bash
npm run seed --prefix backend
```

Cria 3 posts de exemplo (2 publicados, 1 rascunho).

### 8.5 Rodar com Docker

O `compose.yaml` sobe o frontend em Nginx, a API compilada e um MongoDB com volume
persistente. O Nginx encaminha `/api` para o backend, portanto o navegador acessa
todo o sistema pela mesma origem.

Pré-requisitos:

```bash
docker version
docker compose version
```

Os dois comandos precisam responder com as versões do cliente/servidor e do
Compose. No Linux, se `docker compose` não existir, instale o plugin Compose pelo
gerenciador de pacotes da distribuição.

```bash
# Opcional: configure credenciais reais do Cloudinary e os dados do administrador.
cp .env.docker.example .env

docker compose config
docker compose up --build
```

A aplicação fica disponível em `http://localhost:8080` e a API também pode ser
acessada diretamente em `http://localhost:5000`. Para criar o primeiro
administrador ou popular os posts:

```bash
docker compose exec api npm run admin:create:prod
docker compose exec api npm run seed:prod
```

Para parar os serviços, use `docker compose down`. Os dados do MongoDB permanecem
no volume `boilerplate-lp_mongo_data`; use `docker compose down -v` somente quando
quiser apagá-los.

Os valores padrão do Compose são próprios para desenvolvimento local:
`NODE_ENV=development`, cookie sem `Secure` e credenciais fictícias do Cloudinary.
Antes de usar as imagens em produção, configure HTTPS, `NODE_ENV=production`,
`AUTH_COOKIE_SECURE=true`, um `JWT_SECRET` exclusivo e todas as credenciais reais.

Se a porta `8080` já estiver ocupada, altere `APP_PORT` no `.env` ou sobrescreva
somente nessa execução:

```bash
APP_PORT=18080 docker compose up --build
```

Nesse caso, acesse `http://localhost:18080`. Para verificar toda a stack:

```bash
docker compose ps
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/health
curl http://localhost:8080/api/v1/ready
docker compose logs --tail=100
```

Os três serviços (`frontend`, `api` e `mongo`) devem aparecer como `healthy`.
O fluxo foi validado com build das duas imagens, proxy `/api`, fallback da SPA,
seed executado dentro do container e persistência dos posts após reiniciar o MongoDB.

### 8.6 Testar o login via curl

```bash
curl -i -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exemplo.com","password":"sua-senha"}'
```

A resposta inclui `data.accessToken` no corpo e o cookie `boilerplate_refresh` no header `Set-Cookie`.

---

## 9. Fluxo de autenticação

```
1. POST /auth/login (email + senha)
   └─▶ servidor valida credenciais com bcrypt
       └─▶ cria uma AuthSession no banco (refresh token hasheado, TTL, IP, user-agent)
           └─▶ responde com:
               - accessToken (JWT curto, ~15 min) no corpo da resposta → guardado em MEMÓRIA no front (nunca em localStorage)
               - refresh token (sessionId.secret) em cookie httpOnly + Secure + SameSite=Strict

2. Toda chamada autenticada usa o accessToken:
   Authorization: Bearer <accessToken>

3. Quando o accessToken expira (ou ao recarregar a página, já que ele só existe em memória):
   POST /auth/refresh (sem corpo — o cookie httpOnly vai automaticamente)
   └─▶ servidor valida o refresh token contra o hash salvo na AuthSession
       └─▶ ROTACIONA o refresh token (gera um novo segredo, invalida o anterior)
           └─▶ responde com um novo accessToken + novo cookie de refresh

4. Detecção de reuso: se um refresh token JÁ ROTACIONADO for apresentado de novo
   (ex.: token roubado e usado em paralelo), a sessão inteira é REVOGADA
   imediatamente (revocationReason = 'refresh_token_reuse').

5. Sessão também expira por inatividade (SESSION_IDLE_TTL_MINUTES), independente
   do TTL total (REFRESH_TOKEN_TTL_DAYS).

6. POST /auth/logout revoga a sessão atual e limpa o cookie.
```

Por que access token em memória (não em `localStorage`)? Para reduzir a superfície de um ataque XSS — um script malicioso que rode no seu site não consegue ler um cookie `httpOnly`, e o access token em memória desaparece ao recarregar a página (sendo recuperado via `/auth/refresh`, que também só funciona com o cookie httpOnly).

### 9.1 Cargos (roles) e como adicionar um novo

O boilerplate nasce com **um único cargo: `admin`**. Quem entra no painel pode tudo. Isso é intencional — a maioria dos projetos que começa daqui tem um ou dois operadores, e um sistema de permissões que ninguém usa só atrapalha.

O encanamento para mais cargos, porém, já está montado: o campo `role` existe no `Admin`, viaja como claim no access token e é verificado por `requireRole` em **todas** as rotas de escrita. Adicionar um cargo é preencher esse esqueleto, não construí-lo.

**Passo a passo para criar, por exemplo, um cargo `editor` que escreve posts mas não apaga nada nem vê a auditoria:**

1. **Declare o cargo** em `backend/src/models/Admin.ts`:

   ```ts
   export const ADMIN_ROLES = ['admin', 'editor'] as const;
   ```

   Só isso já faz o TypeScript exigir que você trate o novo valor onde for necessário, e o `verifyAccessToken` passa a aceitá-lo como claim válida.

2. **Escolha o padrão de quem cria conta.** O `role` tem `default: 'admin'` no schema — com mais de um cargo, decida se o padrão continua fazendo sentido ou se vira `editor` (mais seguro: novo usuário nasce com menos poder).

3. **Ajuste as rotas**, listando os cargos que cada uma aceita:

   ```ts
   // pode escrever
   router.post('/admin/posts', protect, requireRole('admin', 'editor'), ...);
   // só admin apaga
   router.delete('/admin/posts/:id', protect, requireRole('admin'), ...);
   // só admin audita
   router.get('/admin/audit-logs', protect, requireRole('admin'), ...);
   ```

   Rotas com `protect` mas **sem** `requireRole` ficam abertas a qualquer cargo autenticado — confira uma a uma (`grep -rn "protect" backend/src/routes`) para não deixar buraco.

4. **Atualize o OpenAPI** (`backend/src/docs/openapi.ts`): o enum de `role` no schema `Admin` e o `summary` das rotas que mudaram de dono.

5. **Reflita no frontend.** O `AdminDto` já traz `role`; esconda o que o cargo não pode fazer:

   ```tsx
   {admin?.role === 'admin' && <li><a href={routes.adminAudit}>Auditoria</a></li>}
   ```

   Isso é **usabilidade, não segurança**: quem decide é o `requireRole` no servidor. Nunca confie no frontend para barrar acesso.

6. **Cubra com teste.** `backend/src/middlewares/authMiddleware.test.ts` já testa `requireRole` — adicione um caso por cargo novo (quem passa, quem toma 403).

7. **Migre as contas existentes**, se já houver banco em produção. Não existe migração automática no boilerplate, e isso é de propósito: mudar cargo é mudar privilégio, e essa decisão é sua, não do startup da aplicação. Faça explicitamente, com o comando registrado:

   ```js
   // mongosh — promova/rebaixe caso a caso, nunca em massa às cegas
   db.admins.updateOne({ email: 'fulano@exemplo.com' }, { $set: { role: 'editor' } })
   ```

> **Cuidado ao remover um cargo:** contas que ficarem com um `role` que não está mais em `ADMIN_ROLES` param de conseguir usar o painel (o `verifyAccessToken` rejeita a claim e o `requireRole` devolve 403). Antes de tirar um cargo da lista, decida conta por conta quem vira o quê — ou desative (`active: false`) quem não deve mais entrar.

---

## 10. Tutorial: como adicionar um novo recurso

Exemplo: vamos adicionar um recurso **Testimonial** (depoimento de cliente: `authorName`, `quote`, `published`).

### Passo 1 — Model (`backend/src/models/Testimonial.ts`)

```ts
import { Schema, Types, model, type InferSchemaType } from 'mongoose';

const testimonialSchema = new Schema(
  {
    authorName: { type: String, required: true, trim: true, maxlength: 120 },
    quote: { type: String, required: true, maxlength: 600 },
    published: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type ITestimonial = InferSchemaType<typeof testimonialSchema> & { _id: Types.ObjectId };

export default model('Testimonial', testimonialSchema);
```

> Atenção: use sempre `Types.ObjectId` (importado de `mongoose`) para o `_id`, nunca `Schema.Types.ObjectId` — são classes diferentes e o TypeScript vai recusar a segunda em tempo de build.

### Passo 2 — DTO (`backend/src/dto/index.ts`)

Adicione `toTestimonialDto` seguindo o padrão de `toPostDto`, lembrando de converter campos opcionais com `?? undefined` (o Mongoose infere campos não obrigatórios como `string | null | undefined`).

### Passo 3 — Rota (`backend/src/routes/testimonialRoutes.ts`)

> **Campo de slug no formulário:** no painel, o slug é preenchido sozinho a partir do título — mas **só ao criar**. Na edição ele fica parado, porque o slug de um post publicado é a URL divulgada e este projeto não tem redirect 301 do endereço antigo para o novo: deixá-lo seguir o título quebraria em silêncio todo link já compartilhado. Assim que alguém edita o slug na mão, ele para de acompanhar o título. A geração (`frontend/src/utils/slugify.ts`) é conveniência de formulário; quem valida continua sendo o `isValidSlug` do backend. Se o seu recurso novo também tiver slug, repita o padrão.

Copie a estrutura de `postRoutes.ts`: leitura pública filtrando `published: true`, um `GET /admin/testimonials/:id` para buscar um único registro (a tela de edição precisa disso — sem ele, o frontend teria que baixar a lista inteira só para editar um item), escrita protegida por `protect` + `requireRole('admin')`, e `recordAuditLog(req, { action, resource, resourceId })` em create/update/delete (passe o `req`: é dele que saem ator, IP, user-agent e `requestId`). Se o recurso tiver um campo único (como `slug` em `Post`), trate o erro de chave duplicada do Mongo com `isDuplicateKeyError` (de `utils/mongoErrors.ts`), devolvendo `409` com uma mensagem clara em vez de deixar cair no 500 genérico.

### Passo 4 — Registrar a rota em `backend/src/app.ts`

```ts
import testimonialRoutes from './routes/testimonialRoutes';
// ...
apiV1.use(testimonialRoutes);
```

### Passo 5 — Cliente de API no frontend (`frontend/src/api/admin.ts`)

Adicione `listTestimonials`, `createTestimonial`, `updateTestimonial`, `deleteTestimonial`, seguindo o padrão dos métodos de `Post`.

### Passo 6 — Página administrativa

Crie `frontend/src/admin/TestimonialsAdminPage.tsx` copiando `PostsAdminPage.tsx` como referência. Para a página ficar de fato acessível, **três coisas precisam existir juntas** (esquecer qualquer uma deixa a página compilando perfeitamente, mas inacessível pela UI — já aconteceu neste boilerplate com a página de Imagens):

1. a rota em `frontend/src/routing.ts` (novo `AppRoute` + entrada em `routes` + `case` em `getRoute`);
2. o `case route.kind === 'admin-testimonials'` dentro do bloco administrativo de `App.tsx` (e incluído na checagem `isAdminRoute`);
3. o link de navegação correspondente em `AdminPortal.tsx`.

Depois de salvar, navegue até clicando no link — não só digitando a URL — para confirmar que a navegação client-side (`navigate()`/interceptação de cliques) está funcionando.

### Passo 7 — Testes

- Backend: um `testimonialRoutes.test.ts` ou, no mínimo, um teste de DTO (`toTestimonialDto`) e de validação, seguindo `dto/index.test.ts` e `utils/validation.test.ts` como modelo.
- Frontend: se a página tiver lógica não trivial (formatação, filtros), cubra com um teste de unidade.

### Critério de "pronto"

- [ ] `npm run typecheck` passa nos dois pacotes;
- [ ] `npm test` passa nos dois pacotes;
- [ ] `npm run lint` passa nos dois pacotes;
- [ ] Testado manualmente: criar, editar, listar (público e admin) e excluir o recurso via UI;
- [ ] Commit feito seguindo a seção [4.6](#46-convenção-de-commits-conventional-commits) (`feat(backend): adiciona rotas de testimonial`, depois `feat(frontend): adiciona pagina admin de testimonials`, etc. — uma task, um commit).

---

## 11. Testes

```bash
npm test                       # unitários: backend + frontend, na raiz
npm test --prefix backend      # node:test + tsx (exclui integration/)
npm run test:integration       # integração com mongodb-memory-server (login → refresh → CRUD Post → contato)
npm test --prefix frontend     # vitest — routing e cliente HTTP
npm run test:e2e               # Playwright: login + CRUD de Post (requer API + admin; ver abaixo)
```

O que cada suíte cobre hoje:

- `backend/src/config/env.test.ts` — parsing/validação de variáveis de ambiente;
- `backend/src/middlewares/security.test.ts` — bloqueio de chaves Mongo perigosas (`$where`, etc.);
- `backend/src/auth/tokens.test.ts` — assinatura/verificação de JWT, formato do refresh token;
- `backend/src/dto/index.test.ts` — serialização Model → DTO (público vs. admin);
- `backend/src/utils/validation.test.ts` — email (com limite de tamanho), slug, ObjectId, URL http(s);
- `backend/src/utils/logger.test.ts` — níveis, formatos, mascaramento de segredos, `child()`, correlação por requestId;
- `backend/src/utils/audit.test.ts` — montagem da entrada de auditoria e validação dos filtros da listagem;
- `backend/src/middlewares/requestLogger.test.ts` — normalização do `x-request-id` (inclusive tentativa de forjar linha de log);
- `backend/src/middlewares/authMiddleware.test.ts` — `requireRole`: quem passa, quem toma 403;
- `backend/src/middlewares/upload.test.ts` — tradução dos erros do multer em 400;
- `backend/src/utils/mongoErrors.test.ts` — chave duplicada e erro de validação do Mongoose;
- `backend/src/utils/pagination.test.ts` — parse de `page`/`limit` e meta de resposta;
- `backend/src/utils/keepAliveSelfPing.test.ts` — self-ping do Render (flag, URL pública, intervalo);
- `backend/src/app.test.ts` — smoke test HTTP real (`/health`, 404 com contrato de erro), gate do Swagger em produção e módulo de blog ligado/desligado;
- `backend/src/integration/authPosts.integration.test.ts` — fluxos reais contra Mongo em memória (login, refresh, CRUD, contato, auditoria e `x-request-id`);
- `frontend/src/routing.test.ts` — todas as combinações do router próprio, com o blog ligado e desligado;
- `frontend/src/config/features.test.ts` — leitura das feature flags de build;
- `frontend/src/utils/slugify.test.ts` — geração de slug a partir do título (acentos, separadores, formato aceito pela API);
- `frontend/src/api/client.test.ts` — tratamento de sucesso/erro do cliente HTTP;
- `frontend/e2e/admin-posts.spec.ts` — Playwright (login + criar/editar/excluir post).

### 11.1 Playwright (e2e)

1. Suba a API (`npm run dev --prefix backend`) com Mongo + um admin criado (`npm run admin:create --prefix backend`);
2. Na primeira vez: `npx playwright install chromium --prefix frontend`;
3. Rode com as credenciais do admin:

```bash
E2E_ADMIN_EMAIL=seu@email.com E2E_ADMIN_PASSWORD=sua-senha npm run test:e2e
```

O Playwright sobe o Vite em `http://localhost:5173` automaticamente (ou reusa se já estiver no ar). Sem `E2E_ADMIN_*`, o teste é **pulado**.

Para escrever um novo teste unitário, copie o arquivo mais parecido com o que você está testando e siga Arrange-Act-Assert (veja seção [4.5](#45-padrão-de-testes)).

---

## 12. Build de produção

```bash
npm run build                     # builda backend e frontend, na raiz
npm run build --prefix backend    # gera backend/dist (tsc)
npm run build --prefix frontend   # gera frontend/dist (vite build)
```

- Backend: o artefato é `backend/dist/server.js` (e os demais `.js` compilados). É isso que o Render executa (`node dist/server.js`).
- Frontend: o artefato é a pasta `frontend/dist/` (HTML/CSS/JS estáticos). É isso que o Cloudflare Workers serve como assets.

---

## 13. Deploy do backend no Render

### Opção A — via Blueprint (`render.yaml`), recomendado

1. Suba o repositório para o GitHub (ou GitLab/Bitbucket).
2. No [dashboard do Render](https://dashboard.render.com), clique em **"New" → "Blueprint"**.
3. Conecte o repositório. O Render vai detectar automaticamente o `backend/render.yaml` (graças ao campo `rootDir: backend`).
4. Confirme a criação do serviço. Variáveis marcadas com `sync: false` no `render.yaml` (`MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) **precisam ser preenchidas manualmente** no dashboard, em **"Environment"**, antes ou depois do primeiro deploy.
5. A variável `JWT_SECRET` é gerada automaticamente pelo Render (`generateValue: true`) — você não precisa (nem deve) definir a sua localmente.
6. Edite `CORS_ORIGINS` no dashboard depois que tiver a URL final do frontend (veja seção 15).

### Opção B — manual ("New Web Service")

1. **"New" → "Web Service"** → conecte o repositório.
2. **Root Directory**: `backend`.
3. **Build Command**: `npm ci --include=dev && npm run build`.
4. **Start Command**: `node dist/server.js`.
5. **Plan**: Free.
6. Em **"Environment"**, adicione manualmente todas as variáveis listadas na seção [7.3](#73-variáveis-do-backend-backendenv), com `NODE_ENV=production`, `PORT=10000`, `TRUST_PROXY=1`, `AUTH_COOKIE_SECURE=true`.

### Verificando o deploy

```bash
curl https://SEU-SERVICO.onrender.com/health   # deve responder {"data":{"status":"ok"}}
curl https://SEU-SERVICO.onrender.com/ready    # deve responder {"data":{"status":"ready"}} (banco conectado)
```

### Observações sobre o plano free do Render

- **Cold start**: serviços free "dormem" após ~15 minutos sem tráfego. A primeira requisição depois disso pode levar 30-60s para responder — isso é esperado, não é bug. O boilerplate já inclui keep-alive (abaixo) para mitigar o idle na maioria dos casos.
- **Logs**: aba **"Logs"** no dashboard do serviço, em tempo real.
- **Domínio customizado**: aba **"Settings" → "Custom Domains"** do serviço.

### Keep-alive (anti-idle no plano free)

Há **duas camadas** que se complementam para impedir o Render free de dormir por idle:

| Camada | Onde | Quando age | O que faz |
|--------|------|------------|-----------|
| **Self-ping interno** | `backend/src/utils/keepAliveSelfPing.ts`, iniciado em `server.ts` | Enquanto a API está acordada | `GET` periódico na URL **pública** `/ready` — conta como tráfego no proxy do Render e reinicia o timer de idle |
| **Cron GitHub Actions** | `.github/workflows/keep-alive.yml` | A cada 5 min (mesmo se a API já dormiu) | Acorda o serviço de fora; também serve de smoke de uptime |

```
[GitHub cron */5] ──GET /ready──► [Render proxy] ──► [API Node]
                                      ▲
                                      │
[self-ping a cada 4 min] ──GET URL pública /ready──┘
         (só enquanto o processo está up)
```

**Por que as duas?** Self-ping sozinho não revive um processo já dormindo. O cron sozinho depende do schedule do GitHub (pode atrasar). Juntos cobrem idle contínuo e cold start.

**Regra crítica:** o self-ping **não** pode ir para `localhost` / `127.0.0.1`. Só request pela URL pública passa pelo proxy do Render e reseta o idle. Em produção, `RENDER_EXTERNAL_URL` (injetado pelo Render) ou `KEEP_ALIVE_URL` / `API_BASE_URL` resolvem a base.

#### Configuração obrigatória no GitHub (cron)

1. Em **Settings → Environments → production**, crie a variable:
   - `API_BASE_URL` = `https://SEU-SERVICO.onrender.com` (sem barra final)
2. O workflow usa `environment: production` para ler essa var. Ajuste o nome do environment se o seu for outro.
3. Cron só roda no **default branch** e exige Actions habilitados no repositório.

#### Timing

- Idle do Render free ≈ **15 minutos**.
- Self-ping a cada **4 min** enquanto up → idle nunca chega perto de 15.
- Cron a cada **5 min** → margem contra drift do schedule do GitHub.
- Cold start costuma levar **30–60s+**; o workflow faz até **5 tentativas** com backoff (10s, 20s, 40s…) e `curl --max-time 90`.

#### Checklist keep-alive pós-deploy

- [ ] `GET /ready` retorna 200 com o Mongo conectado;
- [ ] Self-ping ativo nos logs da API em produção (`Keep-alive self-ping ativo: …`);
- [ ] Variable `API_BASE_URL` no environment `production` do GitHub;
- [ ] Workflow `Keep-alive` aparece em **Actions** e o cron (ou um `workflow_dispatch`) responde 200.

---

## 14. Deploy do frontend no Cloudflare

### 14.1 Preparação

1. Crie uma conta em https://dash.cloudflare.com/sign-up (gratuita).
2. Instale o Wrangler (CLI da Cloudflare) como dependência de desenvolvimento ou globalmente:
   ```bash
   npm install --save-dev wrangler --prefix frontend
   # ou: npm install -g wrangler
   ```
3. Autentique:
   ```bash
   npx wrangler login
   ```
   Isso abre o navegador para autorizar a CLI na sua conta Cloudflare.

### 14.2 Configurar `wrangler.jsonc`

Edite `frontend/wrangler.jsonc`:

```jsonc
{
  "name": "meu-projeto-frontend",          // vira o subdomínio: meu-projeto-frontend.SEU-USUARIO.workers.dev
  "compatibility_date": "2026-06-20",       // mantenha atualizado; não precisa coincidir com hoje
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

`not_found_handling: "single-page-application"` é **essencial** numa SPA: sem isso, recarregar a página em `/conteudos/algum-slug` retornaria 404, porque esse caminho não existe como arquivo físico — só existe como rota tratada pelo JavaScript no navegador. Com essa opção, qualquer caminho não encontrado cai de volta no `index.html`, e o router do React assume a partir daí.

### 14.3 Build e deploy

```bash
cd frontend

# IMPORTANTE: configure VITE_API_URL com a URL REAL da API no Render
# ANTES de buildar — variáveis VITE_* são embutidas no momento do build.
echo "VITE_API_URL=https://SEU-SERVICO.onrender.com/api/v1" > .env.production
npm run build
npx wrangler deploy
```

O Wrangler imprime a URL pública ao final (algo como `https://meu-projeto-frontend.SEU-USUARIO.workers.dev`).

### 14.4 Alternativa: deploy automático via Git (Workers Builds)

No dashboard da Cloudflare → **"Workers & Pages" → "Create" → "Connect to Git"**:
1. Selecione o repositório e a pasta `frontend` como diretório raiz do build (campo "Root directory");
2. **Build command**: `npm run build`;
3. **Build output directory**: `dist`;
4. Em **"Environment Variables"**, defina `VITE_API_URL` com a URL da API no Render;
5. Cada push na branch configurada (geralmente `main`) gera um novo deploy automaticamente.

### 14.5 Domínio customizado

No dashboard do Worker → **"Settings" → "Domains & Routes" → "Add Custom Domain"**. A Cloudflare cuida do certificado TLS automaticamente se o domínio já estiver na sua conta Cloudflare (DNS gerenciado por ela).

---

## 15. Conectando frontend e backend em produção

1. Depois do primeiro deploy do frontend, copie a URL final (workers.dev ou domínio customizado).
2. No Render, edite a variável `CORS_ORIGINS` do backend para incluir essa URL (separada por vírgula se houver mais de uma, ex. com e sem `www`):
   ```
   CORS_ORIGINS=https://meu-projeto-frontend.SEU-USUARIO.workers.dev,https://meudominio.com
   ```
3. Salve — o Render reinicia o serviço automaticamente ao alterar uma env var.
4. Confirme que `frontend/.env.production` (ou a env var configurada no dashboard da Cloudflare) aponta para a URL real do backend, e refaça o deploy do frontend se tiver mudado depois do build anterior.

### Por que `SameSite=Strict` + `Secure` "só funcionam" com HTTPS dos dois lados

O cookie de refresh token é configurado com `secure: true` (exige HTTPS) e `sameSite: 'strict'` (só é enviado em navegação de primeira parte, dentro do mesmo site). Como Render e Cloudflare Workers servem tudo via HTTPS por padrão (certificados gerenciados automaticamente), essa exigência já está satisfeita sem nenhuma configuração extra sua — mas **não funciona** se você tentar testar com `http://` em produção, ou se misturar protocolos entre frontend e backend.

### Checklist de teste pós-deploy

Marque cada item depois de validar no ambiente real (não no localhost):

- [ ] Login funciona end-to-end (consegue logar no painel admin pela URL pública);
- [ ] Recarregar a página no painel admin mantém a sessão (testa o fluxo de `/auth/refresh`);
- [ ] Criar/editar/excluir um Post funciona pelo painel;
- [ ] Páginas **Mensagens** (`/admin/mensagens`) e **Auditoria** (`/admin/auditoria`) listam dados;
- [ ] Um login com senha errada aparece na tela de **Auditoria** com resultado `falha`;
- [ ] Upload de imagem funciona e a URL retornada do Cloudinary carrega no navegador;
- [ ] Formulário de contato público (`/contato`) envia sem erro de CORS;
- [ ] `GET /health` e `GET /ready` da API respondem 200;
- [ ] Swagger UI **não** abre em `https://SEU-SERVICO.onrender.com/api/docs` (desligado por padrão em produção — só abre com `ENABLE_API_DOCS=true`);
- [ ] Os logs do Render saem em JSON, uma linha por requisição, com `requestId`;
- [ ] Keep-alive configurado: variable `API_BASE_URL` no environment `production` do GitHub e workflow `Keep-alive` passando;
- [ ] (Opcional) `SENTRY_DSN` / `VITE_SENTRY_DSN` configurados e um erro de teste aparece no Sentry.

---

## 16. Checklist de segurança pré-produção

Marque antes do go-live:

- [ ] `JWT_SECRET` forte (32+ caracteres aleatórios) e **único** por ambiente — nunca reaproveite o de desenvolvimento;
- [ ] `AUTH_COOKIE_SECURE=true` em produção (o boilerplate já recusa subir se isso não estiver correto — veja `validateServerEnv()`);
- [ ] `CORS_ORIGINS` restrito aos domínios reais do seu frontend — **nunca** `*` em produção;
- [ ] Rate limit ativo nas rotas de login e contato (`rateLimit` em `authRoutes.ts`/`contactRoutes.ts`) — ajuste os limites conforme seu tráfego esperado;
- [ ] `.env` **nunca** commitado — confira que `backend/.gitignore` e `frontend/.gitignore` cobrem `.env`;
- [ ] `npm audit` sem vulnerabilidades de severidade alta/crítica em ambos os pacotes;
- [ ] Senha do primeiro administrador forte (8+ caracteres, idealmente gerada, não reaproveitada);
- [ ] Variáveis sensíveis (`MONGODB_URI`, credenciais Cloudinary, `SENTRY_DSN`) configuradas só no dashboard do Render/Cloudflare, nunca em código ou em `render.yaml`;
- [ ] Swagger em produção: `/api/docs` e `/api/docs.json` já ficam **desligados** quando `NODE_ENV=production`. Só ligue com `ENABLE_API_DOCS=true` se precisar mesmo — e de preferência atrás de rede/proxy restrito;
- [ ] Logs: confira que nada sensível vaza no `LOG_LEVEL` de produção. O logger mascara chaves que parecem segredo (`password`, `senha`, `token`, `secret`, `authorization`, `cookie`, `api_key`) em qualquer profundidade — se você logar um campo sensível com outro nome, adicione o padrão em `SENSITIVE_KEY_PATTERN` (`backend/src/utils/logger.ts`);
- [ ] Validação de tamanho nas rotas públicas: `/contact` recusa nome > 120 e mensagem > 4000 antes de tocar o banco, e `isValidEmail` limita a 200 — se você criar rota pública nova, espelhe o `maxlength` do schema na validação (senão o payload vira 500 em vez de 400);
- [ ] `coverImageUrl` (e qualquer URL vinda de formulário) validada como `http(s)` — `javascript:`/`data:` viram XSS dependendo de onde o frontend renderizar;
- [ ] Índices criados no primeiro boot (o log mostra a API subindo sem erro): `AuthSession` depende do TTL em `expiresAt` para não acumular sessão vencida, e `RateLimit` do TTL para o contador não virar uma coleção infinita;
- [ ] Módulos que o projeto não usa desligados nas **duas** pontas (`ENABLE_BLOG` + `VITE_ENABLE_BLOG`) — rota não montada é superfície de ataque que não existe;
- [ ] Auditoria: revise a tela `/admin/auditoria` depois do go-live (logins com falha em sequência a partir de um mesmo IP são o primeiro sinal de ataque de senha).

---

## 17. Troubleshooting comum

**Erro de CORS no navegador (`blocked by CORS policy`)**
A origem do frontend não está em `CORS_ORIGINS` no backend, ou há `http` vs `https` divergente. Confira a env var no Render e refaça o deploy/restart do serviço.

**Loop infinito de 401 / usuário deslogado sozinho**
Geralmente é `SESSION_IDLE_TTL_MINUTES` muito baixo, ou o cookie de refresh não está sendo enviado (confira se o frontend usa `credentials: 'include'` em todas as chamadas — o `apiClient` deste boilerplate já faz isso por padrão).

**Primeira requisição depois de um tempo demora muito (30-60s)**
Cold start do plano free do Render — comportamento esperado se o serviço dormiu. Com o keep-alive configurado (seção 13), isso deve ser raro; se ainda acontecer, confira se o workflow `Keep-alive` está rodando e se `API_BASE_URL` está correta no environment `production` do GitHub.

**A API não sobe e o log mostra "Variaveis de ambiente obrigatorias ausentes"**
Isso é **intencional** — `validateServerEnv()` recusa iniciar sem as variáveis críticas configuradas, para evitar rodar em produção com configuração incompleta (ex.: sem `JWT_SECRET`, sem credenciais do Cloudinary). Confira o nome exato da variável citada no log e configure-a no Render.

**Erro de conexão com MongoDB Atlas ("connection timed out" ou "IP not allowed")**
O IP do servidor (ou seu IP local) não está liberado em **Network Access** no Atlas. Para o Render, libere `0.0.0.0/0` (veja seção 7.5).

---

## 18. Agentes de IA (`agentes/`)

A pasta `agentes/` guarda instruções prontas para assistentes de código (Claude Code, Cursor, Codex, Gemini) trabalharem **neste site** sem precisar redescobrir os padrões do projeto a cada conversa.

É opcional. Nada aqui depende dela: o projeto roda, testa e faz deploy igual se você apagar a pasta inteira.

### Por que existe

Um projeto que nasce de boilerplate é justamente o que mais perde as próprias convenções. O código de partida já está pronto, então ninguém releu as regras — e o assistente, que não leu nenhuma, preenche a lacuna com o que é **popular na internet**, não com o que é verdade aqui. Na prática isso vira: instalar react-router num projeto que tem router próprio, `console.log` onde existe logger estruturado, token no `localStorage` num projeto que o mantém em memória de propósito, e rota devolvendo documento do Mongoose direto — que vaza `passwordHash`.

Nenhuma dessas quebra o build. Todas passam despercebidas no review e viram dívida.

O segundo motivo é o formato. Um documento gigante que chega **sempre** compete com o problema em questão pela atenção do modelo: o assistente lê sobre deploy no Render enquanto tenta corrigir um teste. Por isso o que precisa valer sempre (contrato da API, camadas, idioma) fica separado do que só vale num momento específico (auditar segurança, fechar uma task do Jira) — e o segundo grupo só é carregado quando aquele momento chega.

### Instalação

Cada ferramenta lê os agentes de um lugar diferente. O script copia para o lugar certo:

```bash
./agentes/instalar.sh              # claude + cursor + codex
./agentes/instalar.sh claude       # só uma ferramenta
```

| Ferramenta | Instala em | Como usar |
|---|---|---|
| **Claude Code** | `.claude/agents/` | `/agents`, ou "use o agente `verificador`" |
| **Cursor** | `.cursor/rules/` | automático (por pasta); as demais o agente puxa quando o assunto bate |
| **Codex** | `AGENTS.md` na raiz | lido sozinho a cada sessão |
| **Gemini** | não instala | cole `agentes/gemini/contexto-projeto.md` no início do chat |

Os destinos são **gitignorados de propósito**: `agentes/` é a fonte da verdade, e versionar as duas cópias criaria duas versões da mesma regra divergindo em silêncio. Depois de clonar um projeto, rode o script uma vez.

### Os agentes

| Agente | Quando usar |
|---|---|
| `setup-inicial` | uma vez, ao criar o projeto: renomeia tudo, aponta cada variável a preencher, decide os módulos |
| `estado-do-projeto` | ao chegar no projeto ou voltar depois de semanas: o que já é deste site, o que ainda é padrão de fábrica, o que falta |
| `task-jira` | do ticket ao PR: quebra em commits, cria a branch com a chave da issue, entrega o texto para colar no Jira |
| `novo-recurso` | recurso CRUD novo (depoimentos, serviços, portfólio) do schema à tela, seguindo a seção 10 |
| `revisor-de-codigo` | antes de commitar: confere o diff contra a seção 4 |
| `auditor-de-seguranca` | antes de deploy, e sempre que mexer em auth, rota admin, upload ou validação de entrada |
| `verificador` | roda typecheck + testes + lint + integração + build e dá veredito binário |

Fluxo típico de uma task: `task-jira` → `novo-recurso` → `revisor-de-codigo` → `auditor-de-seguranca` (se tocou em algo sensível) → `verificador` → PR.

### Dúvidas úteis

**Isso substitui o review humano ou o CI?**
Não, e é importante que não. Assistente ignora instrução, principalmente em conversa longa. Os agentes reduzem a chance de o código sair fora do padrão; quem **garante** é `npm run typecheck && npm test && npm run lint` e o CI, que não esquecem.

**Mudei um padrão no README. Preciso atualizar os agentes?**
Quase sempre não. Os agentes das ferramentas com acesso a arquivo **apontam** para as seções em vez de copiá-las — eles leem a versão atual. As exceções são duas: o contexto do Gemini (roda num chat sem acesso ao repositório, então carrega os moldes de código junto) e o `AGENTS.md` do Codex (arquivo único por convenção da ferramenta). Se você mudar o contrato da API, o padrão de log ou a estrutura de pastas, revise esses dois.

**Por que o Gemini é diferente dos outros?**
Porque é o único que roda num chat sem acesso ao repositório. Os outros podem ler `postRoutes.ts` e copiar o padrão de lá; o Gemini precisa receber os moldes prontos no texto. Por isso `contexto-projeto.md` é mais longo e cheio de exemplos de código: é a única coisa que ele vai saber sobre o projeto.

**O agente pode commitar, fazer deploy ou mexer no Jira sozinho?**
Não por conta própria — cada um tem limite escrito. O `verificador` diagnostica mas não corrige (corrigir mudaria o código que ele acabou de verificar). O `revisor-de-codigo` reporta mas não edita. O `task-jira` entrega o texto do ticket mas não muda status nem responsável. Você pode pedir para irem além; eles não vão sozinhos.

**Preciso criar um agente novo a cada recurso que eu adicionar?**
Não. Os agentes descrevem **padrões**, não recursos. Um site com depoimentos, vagas e portfólio usa exatamente os mesmos sete.

**Uso outra ferramenta (Windsurf, Cline, Continue, Copilot).**
Tente primeiro o `AGENTS.md` na raiz — virou convenção e várias ferramentas já leem. Se a sua não lê, o contexto do Gemini funciona como texto de sistema em qualquer chat.

**Os agentes servem para o boilerplate ou para o site que nasce dele?**
Para o site. Eles assumem que o projeto **já foi customizado** e trabalham a partir disso — o `estado-do-projeto`, por exemplo, existe justamente para separar o que já é deste cliente do que ainda é exemplo de fábrica.

**Posso editar ou apagar?**
Pode. São arquivos de texto, sem efeito no build. Se editar, mexa em `agentes/` (a fonte) e rode o script de novo — editar direto em `.claude/agents/` funciona até a próxima instalação sobrescrever. As convenções que valem a pena manter ao escrever um agente novo estão em `agentes/README.md`.

---
