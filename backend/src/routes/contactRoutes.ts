import { Router } from 'express';
import { rateLimit } from '../middlewares/rateLimit';
import { protect, requireRole } from '../middlewares/authMiddleware';
import ContactMessage from '../models/ContactMessage';
import { toContactMessageDto } from '../dto';
import { isTextWithinLimit, isValidEmail } from '../utils/validation';
import { parsePagination, toPaginatedResult } from '../utils/pagination';

const router = Router();

const contactRateLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, keyPrefix: 'contact' });

router.post('/contact', contactRateLimit, async (req, res) => {
  const { name, email, message } = req.body as Record<string, unknown>;

  // Os limites espelham o schema de ContactMessage.
  if (!isTextWithinLimit(name, 120) || !isValidEmail(email) || !isTextWithinLimit(message, 4000)) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Informe nome (ate 120), email valido e mensagem (ate 4000 caracteres).',
      },
    });
    return;
  }

  // Persiste no banco para nao perder a mensagem (o Render free tier tem
  // sistema de arquivos efemero e os logs nao sao um lugar confiavel para
  // guardar dados). Ponto de extensao: alem de salvar, integrar com um
  // servico de e-mail (ex.: Web3Forms, Resend) para notificar em tempo real.
  await ContactMessage.create({ name, email: email.trim().toLowerCase(), message });

  res.status(201).json({ data: { received: true } });
});

router.get('/admin/contact-messages', protect, requireRole('admin'), async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const [messages, total] = await Promise.all([
    ContactMessage.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ContactMessage.countDocuments(),
  ]);
  res.json({
    data: toPaginatedResult(
      messages.map((entry) =>
        toContactMessageDto({
          ...entry,
          createdAt: (entry as unknown as { createdAt: Date }).createdAt,
        }),
      ),
      total,
      page,
      limit,
    ),
  });
});

export default router;
