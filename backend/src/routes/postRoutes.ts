import { Router } from 'express';
import Post from '../models/Post';
import { protect, requireRole, type AuthRequest } from '../middlewares/authMiddleware';
import { toPostDto, toPublicPostDto } from '../dto';
import {
  isNonEmptyString,
  isValidHttpUrl,
  isValidObjectId,
  isValidSlug,
} from '../utils/validation';
import { recordAuditLog } from '../utils/audit';
import { isDuplicateKeyError } from '../utils/mongoErrors';
import { parsePagination, toPaginatedResult } from '../utils/pagination';

const router = Router();

router.get('/posts', async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const filter = { published: true };
  const [posts, total] = await Promise.all([
    Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Post.countDocuments(filter),
  ]);
  res.json({ data: toPaginatedResult(posts.map(toPublicPostDto), total, page, limit) });
});

router.get('/posts/:slug', async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug, published: true });
  if (!post) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conteudo nao encontrado.' } });
    return;
  }
  res.json({ data: toPublicPostDto(post) });
});

router.get('/admin/posts', protect, async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const [posts, total] = await Promise.all([
    Post.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Post.countDocuments(),
  ]);
  res.json({ data: toPaginatedResult(posts.map(toPostDto), total, page, limit) });
});

router.get('/admin/posts/:id', protect, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Identificador invalido.' } });
    return;
  }

  const post = await Post.findById(req.params.id);
  if (!post) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conteudo nao encontrado.' } });
    return;
  }
  res.json({ data: toPostDto(post) });
});

router.post('/admin/posts', protect, requireRole('admin'), async (req: AuthRequest, res) => {
  const { title, slug, excerpt, content, coverImageUrl, published } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(title) || !isValidSlug(slug) || !isNonEmptyString(content)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Informe titulo, slug e conteudo validos.' } });
    return;
  }

  if (coverImageUrl !== undefined && !isValidHttpUrl(coverImageUrl)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'coverImageUrl deve ser uma URL http(s).' } });
    return;
  }

  try {
    const post = await Post.create({
      title,
      slug,
      excerpt: typeof excerpt === 'string' ? excerpt : undefined,
      content,
      coverImageUrl: typeof coverImageUrl === 'string' ? coverImageUrl : undefined,
      published: Boolean(published),
    });

    await recordAuditLog(req, {
      action: 'create',
      resource: 'post',
      resourceId: String(post._id),
      metadata: { title: post.title, slug: post.slug, published: post.published },
    });
    res.status(201).json({ data: toPostDto(post) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({ error: { code: 'SLUG_TAKEN', message: 'Ja existe um conteudo com esse slug.' } });
      return;
    }
    throw error;
  }
});

router.put('/admin/posts/:id', protect, requireRole('admin'), async (req: AuthRequest, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Identificador invalido.' } });
    return;
  }

  const { title, slug, excerpt, content, coverImageUrl, published } = req.body as Record<string, unknown>;
  if (slug !== undefined && !isValidSlug(slug)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Slug invalido.' } });
    return;
  }
  if (title !== undefined && !isNonEmptyString(title)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Titulo invalido.' } });
    return;
  }
  if (content !== undefined && !isNonEmptyString(content)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Conteudo invalido.' } });
    return;
  }
  if (coverImageUrl !== undefined && !isValidHttpUrl(coverImageUrl)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'coverImageUrl deve ser uma URL http(s).' } });
    return;
  }

  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      {
        ...(title !== undefined ? { title } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(excerpt !== undefined ? { excerpt } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
        ...(published !== undefined ? { published: Boolean(published) } : {}),
      },
      { returnDocument: 'after' },
    );

    if (!post) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conteudo nao encontrado.' } });
      return;
    }

    await recordAuditLog(req, {
      action: 'update',
      resource: 'post',
      resourceId: String(post._id),
      // Guarda o que mudou (nao o documento inteiro): o audit log precisa ser
      // legivel e barato, o conteudo completo ja esta na colecao de posts.
      metadata: { fields: Object.keys(req.body as Record<string, unknown>), slug: post.slug },
    });
    res.json({ data: toPostDto(post) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({ error: { code: 'SLUG_TAKEN', message: 'Ja existe um conteudo com esse slug.' } });
      return;
    }
    throw error;
  }
});

router.delete('/admin/posts/:id', protect, requireRole('admin'), async (req: AuthRequest, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Identificador invalido.' } });
    return;
  }

  const post = await Post.findByIdAndDelete(req.params.id);
  if (!post) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conteudo nao encontrado.' } });
    return;
  }

  await recordAuditLog(req, {
    action: 'delete',
    resource: 'post',
    resourceId: String(post._id),
    metadata: { title: post.title, slug: post.slug },
  });
  res.json({ data: { deleted: true } });
});

export default router;
