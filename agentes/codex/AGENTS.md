# AGENTS.md

Instruções para agentes de código neste repositório. Vale para tudo abaixo desta pasta.

## O que é este projeto

Monorepo de duas pastas independentes — site institucional/landing page com painel administrativo. Nasceu de um boilerplate, mas **não é mais o boilerplate**: é o site de um cliente. Ao decidir entre "o que é comum em projetos assim" e "o que este repositório já faz", **o repositório vence sempre**.

- `frontend/` — React 19 + Vite + TypeScript. Router próprio em `src/routing.ts` (não há react-router). Sem lib de estado global: `useState` e um `AuthContext`. Testes com `vitest`.
- `backend/` — Express 5 + Mongoose 9 + TypeScript (CommonJS). Testes com `node:test` + `tsx` (não há Jest nem Vitest — não instale).

`README.md` é a fonte da verdade e é extenso de propósito. Seção 4 = padrões de código; 9.1 = cargos; 10 = tutorial de recurso novo; 11 = testes; 16 = checklist de segurança.

## Antes de considerar qualquer trabalho concluído

```bash
npm run typecheck && npm test && npm run lint
```

Na raiz, roda nos dois pacotes. Antes de PR ou deploy, adicione:

```bash
npm run test:integration   # Mongo em memória, mais lento
npm run build
```

`npm run test:e2e` (Playwright) não entra na rotina: exige API no ar e admin real, e sem as variáveis `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` ele se auto-pula — o "pass" seria falso conforto.

Nunca commite com qualquer uma dessas etapas vermelha.

## Regras que não se negociam

**Contrato da API.** Sucesso: `{ data: ... }`. Erro: `{ error: { code, message } }` com `code` em `SCREAMING_SNAKE_CASE`. Rota nunca devolve documento do Mongoose direto — sempre por `dto/`, senão vaza `passwordHash`, `refreshTokenHash`, `__v`.

**Erro de cliente é 4xx, nunca 500.** Entrada malformada, corpo grande demais, campo acima do limite: tudo `4xx`. Se aparecer `INTERNAL_ERROR` no log, é bug de verdade.

**Idioma.** Identificadores em inglês; mensagem para usuário final em português; mensagem de erro da API do backend sem acento (siga as existentes). Comentário explica *por quê*, não *o quê*.

**Arquivos e testes.** Componente React `PascalCase.tsx`, demais `camelCase.ts`. Teste `*.test.ts` ao lado do arquivo testado, nunca em `__tests__/`. `describe` nomeia a unidade, `it` descreve o comportamento em português afirmativo.

**Commits.** `tipo(escopo): descrição no imperativo` (`feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`, `perf`). Uma task por commit; use `git add` dos arquivos da task, não `git add -A`.

**Branches.** `feat|fix|chore/descricao` → PR para `develop` (squash) → PR de release para `main` (merge commit). Ninguém commita direto em `develop` nem em `main`.

## Backend

Camadas: rota valida e responde; model é schema; `dto/` serializa. Sem lógica de domínio no model.

**Sem `console.*`.** Use o logger — erro sempre no campo `err`:

```ts
import { logger } from './utils/logger';
logger.error('falha ao publicar', { err: error, slug });
```

Cada requisição tem `requestId` propagado por `AsyncLocalStorage`; o logger anexa sozinho, inclusive em utilitário sem acesso ao `req`. A máscara cobre chaves que parecem segredo (`password`, `senha`, `token`, `secret`, `authorization`, `cookie`, `api_key`) — campo sensível com outro nome passa direto.

**Ação administrativa que muda estado gera auditoria**, passando o `req` (dele saem ator, IP e requestId):

```ts
await recordAuditLog(req, { action: 'update', resource: 'post', resourceId: String(post._id) });
```

**Rota administrativa leva `protect` + `requireRole('admin')`.** `protect` só garante sessão; quem autoriza é `requireRole`. Há um único cargo (`admin`); para criar outro, seção 9.1 do README.

**Validação espelha o schema.** Se o model tem `maxlength: 200`, a rota valida 200 — senão o erro estoura no Mongo, tarde e como 500. URL vinda de formulário tem que ser `http(s)` validada (`javascript:`/`data:` viram XSS).

Listagem usa `parsePagination` + `toPaginatedResult`. Campo único trata `isDuplicateKeyError` → `409`. Model novo entra em `ensureRequiredIndexes` (`config/db.ts`), senão não tem índice em produção. Coleção que só cresce precisa de TTL ou política explícita.

## Frontend

Rota nova = entrada em `routes`, variante em `AppRoute`, teste em `routing.test.ts`, render em `App.tsx`.

Toda chamada de API passa pelo `apiClient` (`api/client.ts`), que já faz `credentials: 'include'`, timeout, desembrulha o `{ data }` e converte erro em `ApiError`. `fetch` cru só para corpo não-JSON (upload).

**Access token vive em memória**, no `AuthContext` — nunca em `localStorage`/`sessionStorage`. O refresh token está em cookie httpOnly justamente para sobreviver a XSS.

Feature flags vêm de `config/features.ts` (`VITE_*`, embutidas no **build**, não lidas em runtime); cada flag tem par no backend, e desligar só de um lado deixa link levando a 404. Esconder elemento no frontend é usabilidade, não segurança.

Depois de um `await`, `event.currentTarget` já é `null` — guarde a referência do form antes.

## Recurso novo (CRUD)

Leia `backend/src/routes/postRoutes.ts` inteiro antes de escrever: é o modelo vivo do padrão. Sequência: model (com `maxlength` e índices) → `ensureRequiredIndexes` → DTO → rotas → montar em `app.ts` → OpenAPI → tipo e chamadas no frontend → página e rota → testes. Detalhe completo na seção 10 do README.

Recurso com slug: gere a partir do título **só na criação** (`frontend/src/utils/slugify.ts`), nunca na edição — slug publicado é URL divulgada e não há redirect 301 aqui.

## Segurança

Checklist completo na seção 16 do README. Verifique **executando**, não só lendo. Pontos onde este projeto já falhou:

- `const { x } = req.body` sem corpo parseado (no Express 5 `req.body` fica `undefined`) → 500;
- validação que não espelha o `maxlength` do schema → 500 em vez de 400;
- rota administrativa com `protect` mas sem `requireRole`;
- campo sensível com nome que a máscara do logger não pega;
- coleção sem TTL crescendo para sempre;
- `ENABLE_API_DOCS` ligado em produção; `CORS_ORIGINS` com `*`; `TRUST_PROXY` incoerente com o proxy real (estraga rate limit por IP e o IP da auditoria).

Segredo que já foi commitado está vazado: rotacione, não apague.

## Ao entregar

Diga o que fez, o que decidiu sozinho por falta de especificação, e o que ficou de fora de propósito. Se um passo falhou, mostre a saída — não descreva como sucesso parcial.
