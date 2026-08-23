import { Router } from 'express';
import AuditLog from '../models/AuditLog';
import { toAuditLogDto } from '../dto';
import { protect, requireRole } from '../middlewares/authMiddleware';
import { buildAuditLogFilter } from '../utils/audit';
import { parsePagination, toPaginatedResult } from '../utils/pagination';

const router = Router();

router.get('/admin/audit-logs', protect, requireRole('admin'), async (req, res) => {
  const parsed = buildAuditLogFilter(req.query as Record<string, unknown>);
  if (!parsed.ok) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: parsed.message } });
    return;
  }

  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const [logs, total] = await Promise.all([
    AuditLog.find(parsed.filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(parsed.filter),
  ]);

  res.json({
    data: toPaginatedResult(
      logs.map((log) =>
        toAuditLogDto({
          ...log,
          createdAt: (log as unknown as { createdAt: Date }).createdAt,
        }),
      ),
      total,
      page,
      limit,
    ),
  });
});

export default router;
