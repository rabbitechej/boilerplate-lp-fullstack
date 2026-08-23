# Contexto do projeto — cole isto no início da conversa

> Instruções para você, assistente: o texto abaixo descreve um projeto real. Ao gerar código, siga **exatamente** estes padrões, mesmo que você conheça alternativas mais populares — o código precisa cair dentro de uma base existente, não ser bonito isoladamente. Quando faltar informação para decidir, pergunte em vez de inventar nome de campo, texto de tela ou variável de ambiente.

## O projeto

Monorepo com duas pastas independentes: um site institucional/landing page com painel administrativo protegido por login.

- `frontend/` — **React 19 + Vite + TypeScript**. Router **próprio** em `src/routing.ts` (não existe react-router aqui). Sem Redux/Zustand/React Query: `useState` e um `AuthContext`. Testes com `vitest`.
- `backend/` — **Express 5 + Mongoose 9 + TypeScript** (CommonJS). Testes com `node:test` + `tsx` — **não há Jest nem Vitest no backend**.
- Banco: MongoDB. Imagens: Cloudinary. Deploy: backend no Render, frontend no Cloudflare.

## Nunca faça

- **Não sugira instalar** react-router, Redux, Zustand, React Query, Jest, axios, lodash, express-validator, winston/pino. Tudo que essas libs resolveriam já tem solução própria aqui.
- **Não use `console.log`/`console.error` no backend** — existe um logger estruturado.
- **Não guarde token em `localStorage`** — o access token vive em memória, de propósito.
- **Não devolva documento do Mongoose direto numa resposta** — vaza `passwordHash`, `refreshTokenHash`, `__v`.
- **Não crie pasta `__tests__/`** — o teste fica ao lado do arquivo testado.

## Convenções

- Identificadores de código em **inglês**; mensagens para o usuário final em **português**; mensagens de erro da API do backend **sem acento** (`'Rota nao encontrada.'`).
- Componente React: `PascalCase.tsx`. Demais arquivos: `camelCase.ts`.
- Rota HTTP no plural e em inglês: `/posts`, `/admin/posts`, `/auth/login`.
- Comentário explica **por que**, não o que o código faz.
- Commits: `tipo(escopo): descrição no imperativo` — `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`, `perf`.

## Contrato da API — vale para toda rota

```jsonc
// sucesso
{ "data": { } }
// erro
{ "error": { "code": "INVALID_INPUT", "message": "Informe titulo, slug e conteudo validos." } }
```

`code` em `SCREAMING_SNAKE_CASE`. Entrada malformada é sempre `4xx` — se virar `500`, é bug.

## Moldes — gere código nestes formatos

**Model** (`backend/src/models/`) — todo campo de texto tem `maxlength`, porque a validação da rota espelha esse número:

```ts
import { Schema, Types, model, type InferSchemaType } from 'mongoose';

const testimonialSchema = new Schema(
  {
    author: { type: String, required: true, trim: true, maxlength: 120 },
    quote: { type: String, required: true, maxlength: 2000 },
    published: { type: Boolean, default: false },
  },
  { timestamps: true },
);

testimonialSchema.index({ createdAt: -1 });

export type ITestimonial = InferSchemaType<typeof testimonialSchema> & { _id: Types.ObjectId };
export default model('Testimonial', testimonialSchema);
```

Todo model novo também precisa entrar em `ensureRequiredIndexes` (`backend/src/config/db.ts`) — em produção o `autoIndex` fica desligado, então índice não declarado ali não existe.

**DTO** (`backend/src/dto/index.ts`) — a fronteira entre banco e resposta:

```ts
export type TestimonialDto = { id: string; author: string; quote: string; published: boolean };

export function toTestimonialDto(entry: ITestimonial): TestimonialDto {
  return { id: String(entry._id), author: entry.author, quote: entry.quote, published: entry.published };
}
```

**Rota** (`backend/src/routes/`):

```ts
router.post('/admin/testimonials', protect, requireRole('admin'), async (req: AuthRequest, res) => {
  const { author, quote, published } = req.body as Record<string, unknown>;

  // Os limites espelham o schema do model.
  if (!isTextWithinLimit(author, 120) || !isTextWithinLimit(quote, 2000)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Informe autor e depoimento validos.' } });
    return;
  }

  const entry = await Testimonial.create({ author, quote, published: Boolean(published) });

  await recordAuditLog(req, {
    action: 'create',
    resource: 'testimonial',
    resourceId: String(entry._id),
  });

  res.status(201).json({ data: toTestimonialDto(entry) });
});
```

Pontos obrigatórios: `protect` **e** `requireRole('admin')` em rota administrativa (o `protect` só garante que existe sessão; quem autoriza é o `requireRole`); validação espelhando o schema; `recordAuditLog(req, …)` em toda ação que muda estado, sempre recebendo o `req` — é dele que saem ator, IP e `requestId`.

Listagem usa os helpers de paginação:

```ts
const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
const [items, total] = await Promise.all([
  Testimonial.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  Testimonial.countDocuments(filter),
]);
res.json({ data: toPaginatedResult(items.map(toTestimonialDto), total, page, limit) });
```

**Log** — nunca `console`; erro sempre no campo `err`:

```ts
import { logger } from '../utils/logger';

logger.info('depoimento publicado', { id: String(entry._id) });
logger.error('falha ao publicar depoimento', { err: error });
```

Cada requisição já carrega um `requestId` que o logger anexa sozinho. O logger mascara chaves que parecem segredo (`password`, `senha`, `token`, `secret`, `authorization`, `cookie`, `api_key`) — se você criar um campo sensível com outro nome, ele **vai** aparecer no log.

**Teste de backend** — `node:test`, arquivo ao lado do testado, `it` em português afirmativo:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isValidEmail } from './validation';

describe('isValidEmail', () => {
  it('aceita email valido', () => {
    assert.equal(isValidEmail('a@b.com'), true);
  });

  it('rejeita email acima do limite do schema', () => {
    assert.equal(isValidEmail(`${'a'.repeat(200)}@exemplo.com`), false);
  });
});
```

**Chamada de API no frontend** — sempre pelo `apiClient`, que já faz `credentials: 'include'`, timeout, desembrulha o `{ data }` e converte erro em `ApiError`:

```ts
listTestimonials(accessToken: string, page = 1, limit = 20) {
  return apiClient.get<Paginated<TestimonialDto>>(withPage('/admin/testimonials', page, limit), accessToken);
}
```

**Página do painel** — carrega em `useEffect`, erro vai para estado e aparece em `role="alert"`:

```tsx
export function TestimonialsPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<TestimonialDto[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    adminApi
      .listTestimonials(accessToken)
      .then((result) => setItems(result.items))
      .catch((error) => {
        setLoadError(error instanceof ApiError ? error.message : 'Falha ao carregar os depoimentos.');
      });
  }, [accessToken]);

  if (!accessToken) return null;

  return (
    <div>
      <h1>Depoimentos</h1>
      {loadError && <p role="alert">{loadError}</p>}
      {/* ... */}
    </div>
  );
}
```

Rota nova no frontend exige quatro passos: entrada em `routes`, variante em `AppRoute`, caso em `getRoute` (com teste em `routing.test.ts`) e render em `App.tsx`.

## Autenticação — o desenho já está fechado

Access token JWT curto (~15 min) que **só existe em memória**; refresh token rotativo em cookie `httpOnly` + `Secure` + `SameSite=Strict`, com detecção de reuso que revoga a sessão inteira. Existe um único cargo: `admin`.

Não proponha mudar isso ao resolver outro problema. Se o assunto for autenticação, pergunte antes.

## Módulos opcionais

Partes do site ligam/desligam por variável de ambiente, sempre em par: `ENABLE_BLOG` (backend) com `VITE_ENABLE_BLOG` (frontend), `ENABLE_API_DOCS` para o Swagger. Desligado significa **rota não montada**, não rota escondida. Desligar só de um lado deixa link levando a 404.

## Como eu verifico o que você gerar

```bash
npm run typecheck && npm test && npm run lint
```

Gere código que passe nisso. TypeScript é estrito, o ESLint reclama de variável não usada e não existe `any` livre.

## Como responder

Vá direto ao código, com o caminho do arquivo em cada bloco. Diga o que você decidiu por falta de informação — em destaque, porque é a primeira coisa que preciso conferir. Se o pedido esbarrar em algum ponto acima, diga qual e proponha o caminho que respeita o padrão, em vez de seguir o caminho popular em silêncio.
