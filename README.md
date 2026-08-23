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
---

## 1. Visão geral e filosofia

**O que é:** um monorepo simples com duas pastas independentes — `frontend/` (React + Vite + TypeScript) e `backend/` (Express + TypeScript + MongoDB) — que juntas implementam:

- Uma landing page pública (Home, Sobre, Contato, lista de Conteúdos/Posts);
- Um painel administrativo protegido por login (CRUD de Posts, upload de imagens, log de auditoria);
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

Dev: `typescript` ^6.0.3, `tsx` ^4.22.4, `eslint` ^9.18.0 + `typescript-eslint` (flat config). Sem framework de teste externo — `node:test` nativo.

**Frontend** (`frontend/package.json`):

| Dependência | Versão | Para quê |
|---|---|---|
| `react` / `react-dom` | ^19.1.0 | UI |
| `vite` | ^6.0.11 | Build/dev server |
| `vitest` | ^3.2.6 | Testes |
| `typescript` | ^5.8.3 | Tipagem |

Sem router externo (router próprio, seção 3) e sem lib de UI (design próprio em CSS). Versões exatas (incl. transitivos) ficam travadas nos `package-lock.json`; para ver o que está desatualizado, `npm outdated` em cada pasta.

---

## 3. Estrutura de pastas

```
boilerplate-lp-fullstack/
├── package.json              # scripts de orquestração (dev:full, build, test, lint)
├── .github/workflows/ci.yml   # CI: typecheck/test/lint/build dos dois pacotes a cada push/PR
├── .github/CODEOWNERS          # boilerplate de divisão de dono por domínio (ver seção 4.8)
├── .nvmrc                      # versao do Node usada (mesma do engines.node do backend)
├── LICENSE                      # MIT — edite o titular do copyright
├── frontend/                  # SPA React + Vite + TypeScript
│   ├── wrangler.jsonc         # configuração de deploy no Cloudflare
│   ├── src/
│   │   ├── routing.ts         # router próprio (pathname → AppRoute)
│   │   ├── navigation.ts       # navigate() — pushState + popstate, sem reload completo
│   │   ├── api/                # cliente HTTP (client.ts) e chamadas (admin.ts)
│   │   ├── components/         # componentes compartilhados (Layout, Brand, ErrorBoundary)
│   │   ├── pages/               # páginas públicas (Home, Sobre, Contato, Posts)
│   │   ├── admin/                # páginas do painel (Login, Posts, Imagens)
│   │   ├── context/                # AuthContext (estado de login em memória)
│   │   └── hooks/                   # hooks compartilhados (useReveal)
│   └── ...
└── backend/                    # API Express + TypeScript + MongoDB
    ├── render.yaml             # configuração de deploy no Render (Blueprint)
    └── src/
        ├── server.ts           # ponto de entrada (conecta DB, sobe o Express)
        ├── app.ts               # criação do app Express (middlewares, rotas)
        ├── config/               # leitura/validação de variáveis de ambiente, conexão Mongo
        ├── auth/                  # geração/verificação de JWT, sessões de refresh token
        ├── middlewares/            # auth, segurança, rate limit, upload
        ├── models/                  # schemas Mongoose (Admin, Post, AuthSession, AuditLog, RateLimit, ContactMessage)
        ├── routes/                   # rotas HTTP por recurso
        ├── dto/                        # funções de serialização Model → DTO
        ├── utils/                       # validação, audit log, deteccao de erro de chave duplicada do Mongo
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

### 4.8 Divisão de trabalho em equipe (CODEOWNERS)

Quando o projeto for trabalhado por mais de uma pessoa, divida por **domínio vertical** (cada pessoa cuida do fluxo completo de uma área — rota + model + páginas), não por camada (uma pessoa só de frontend, outra só de backend). Isso evita que duas pessoas fiquem editando os mesmos arquivos de API o tempo todo.

Domínios naturais deste boilerplate:

| Domínio | Arquivos típicos |
|---|---|
| **Auth & Segurança** | `backend/src/auth/`, `middlewares/{authMiddleware,rateLimit,security}.ts`, `models/{Admin,AuthSession,AuditLog}.ts`, `routes/{authRoutes,auditRoutes}.ts`, `frontend/src/context/AuthContext.tsx`, `admin/{LoginPage,AdminPortal}.tsx` |
| **Conteúdo (Posts/Imagens)** | `routes/{postRoutes,uploadRoutes}.ts`, `models/Post.ts`, `middlewares/upload.ts`, `frontend/src/pages/Post*.tsx`, `admin/{PostsAdminPage,ImagesPage}.tsx` |
| **Site público & Contato** | `routes/contactRoutes.ts`, `models/ContactMessage.ts`, `frontend/src/pages/{Home,About,Contact,NotFound}Page.tsx`, `components/`, `navigation.ts`, `routing.ts` |

O contrato entre frontend e backend (`frontend/src/api/`, `backend/src/dto/`, `backend/src/config/`, `app.ts`/`server.ts`, `App.tsx`) é **zona compartilhada**: qualquer PR que toque nesses arquivos precisa de review de mais de uma pessoa, porque uma mudança ali afeta todo mundo silenciosamente.

O arquivo `.github/CODEOWNERS` já vem com essa divisão como boilerplate (com placeholders `@pessoa1`/`@pessoa2`/`@pessoa3`). Para ativar de fato ao formar a equipe:

1. Troque os placeholders pelos handles reais do GitHub de cada pessoa;
2. Garanta que as 3 pessoas tenham acesso de **write** (ou sejam membros de um time) no repositório — senão o GitHub ignora a entrada;
3. Em **Settings → Branches → regra da `main`**, ative **"Require review from Code Owners"** — sem isso, o `CODEOWNERS` só sugere revisores, mas não bloqueia merge sem aprovação do dono daquela área.

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
5. Siga a seção [7. Configuração do ambiente local](#7-configuração-do-ambiente-local) normalmente.

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

### 7.4 Variáveis do frontend (`frontend/.env`)

| Variável         | Descrição                                                                                   |
|-------------------|-----------------------------------------------------------------------------------------------|
| `VITE_API_URL`     | URL base da API, **incluindo** o prefixo `/api/v1` (ex.: `http://localhost:5000/api/v1` em dev, `https://sua-api.onrender.com/api/v1` em produção). |

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

Copie a estrutura de `postRoutes.ts`: leitura pública filtrando `published: true`, um `GET /admin/testimonials/:id` para buscar um único registro (a tela de edição precisa disso — sem ele, o frontend teria que baixar a lista inteira só para editar um item), escrita protegida por `protect` + `requireRole('admin', 'editor')`, e `recordAuditLog` em create/update/delete. Se o recurso tiver um campo único (como `slug` em `Post`), trate o erro de chave duplicada do Mongo com `isDuplicateKeyError` (de `utils/mongoErrors.ts`), devolvendo `409` com uma mensagem clara em vez de deixar cair no 500 genérico.

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
npm test                       # roda backend + frontend, na raiz
npm test --prefix backend      # node:test + tsx — cobre auth, env, validação, DTOs, segurança, app.ts
npm test --prefix frontend     # vitest — cobre routing.ts e o cliente de API
```

O que cada suíte cobre hoje:

- `backend/src/config/env.test.ts` — parsing/validação de variáveis de ambiente;
- `backend/src/middlewares/security.test.ts` — bloqueio de chaves Mongo perigosas (`$where`, etc.);
- `backend/src/auth/tokens.test.ts` — assinatura/verificação de JWT, formato do refresh token;
- `backend/src/auth/sessions.test.ts` — serialização de sessão;
- `backend/src/dto/index.test.ts` — serialização Model → DTO (público vs. admin);
- `backend/src/utils/validation.test.ts` — email, slug, ObjectId, `slugify`;
- `backend/src/app.test.ts` — smoke test HTTP real (`/health`, 404 com contrato de erro);
- `frontend/src/routing.test.ts` — todas as combinações do router próprio;
- `frontend/src/api/client.test.ts` — tratamento de sucesso/erro do cliente HTTP.

Para escrever um novo teste, copie o arquivo mais parecido com o que você está testando e siga Arrange-Act-Assert (veja seção [4.5](#45-padrão-de-testes)).

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

- **Cold start**: serviços free "dormem" após ~15 minutos sem tráfego. A primeira requisição depois disso pode levar 30-60s para responder — isso é esperado, não é bug.
- **Logs**: aba **"Logs"** no dashboard do serviço, em tempo real.
- **Domínio customizado**: aba **"Settings" → "Custom Domains"** do serviço.

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

- [ ] Login funciona end-to-end (consegue logar no painel admin pela URL pública);
- [ ] Recarregar a página no painel admin mantém a sessão (testa o fluxo de `/auth/refresh`);
- [ ] Criar/editar/excluir um Post funciona pelo painel;
- [ ] Upload de imagem funciona e a URL retornada do Cloudinary carrega no navegador;
- [ ] Formulário de contato público (`/contato`) envia sem erro de CORS;
- [ ] `GET /health` e `GET /ready` da API respondem 200.

---

## 16. Checklist de segurança pré-produção

- [ ] `JWT_SECRET` forte (32+ caracteres aleatórios) e **único** por ambiente — nunca reaproveite o de desenvolvimento;
- [ ] `AUTH_COOKIE_SECURE=true` em produção (o boilerplate já recusa subir se isso não estiver correto — veja `validateServerEnv()`);
- [ ] `CORS_ORIGINS` restrito aos domínios reais do seu frontend — **nunca** `*` em produção;
- [ ] Rate limit ativo nas rotas de login e contato (`rateLimit` em `authRoutes.ts`/`contactRoutes.ts`) — ajuste os limites conforme seu tráfego esperado;
- [ ] `.env` **nunca** commitado — confira que `backend/.gitignore` e `frontend/.gitignore` cobrem `.env`;
- [ ] `npm audit` sem vulnerabilidades de severidade alta/crítica em ambos os pacotes;
- [ ] Senha do primeiro administrador forte (8+ caracteres, idealmente gerada, não reaproveitada);
- [ ] Variáveis sensíveis (`MONGODB_URI`, credenciais Cloudinary) configuradas só no dashboard do Render, nunca em código ou em `render.yaml`.

---

## 17. Troubleshooting comum

**Erro de CORS no navegador (`blocked by CORS policy`)**
A origem do frontend não está em `CORS_ORIGINS` no backend, ou há `http` vs `https` divergente. Confira a env var no Render e refaça o deploy/restart do serviço.

**Loop infinito de 401 / usuário deslogado sozinho**
Geralmente é `SESSION_IDLE_TTL_MINUTES` muito baixo, ou o cookie de refresh não está sendo enviado (confira se o frontend usa `credentials: 'include'` em todas as chamadas — o `apiClient` deste boilerplate já faz isso por padrão).

**Primeira requisição depois de um tempo demora muito (30-60s)**
Cold start do plano free do Render — comportamento esperado, não é erro. Veja seção 13.

**A API não sobe e o log mostra "Variaveis de ambiente obrigatorias ausentes"**
Isso é **intencional** — `validateServerEnv()` recusa iniciar sem as variáveis críticas configuradas, para evitar rodar em produção com configuração incompleta (ex.: sem `JWT_SECRET`, sem credenciais do Cloudinary). Confira o nome exato da variável citada no log e configure-a no Render.

**Erro de conexão com MongoDB Atlas ("connection timed out" ou "IP not allowed")**
O IP do servidor (ou seu IP local) não está liberado em **Network Access** no Atlas. Para o Render, libere `0.0.0.0/0` (veja seção 7.5).

---
