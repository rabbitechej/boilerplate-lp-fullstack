import { Router } from 'express';
import bcrypt from 'bcrypt';
import Admin from '../models/Admin';
import { protect, type AuthRequest } from '../middlewares/authMiddleware';
import { rateLimit } from '../middlewares/rateLimit';
import {
  clearRefreshTokenCookie,
  readRefreshTokenCookie,
  setRefreshTokenCookie,
  signAccessToken,
} from '../auth/tokens';
import {
  createAuthSession,
  revokeSessionByRefreshToken,
  rotateAuthSession,
} from '../auth/sessions';
import { toAdminDto } from '../dto';
import { recordAuditLog } from '../utils/audit';
import { isValidEmail, isNonEmptyString } from '../utils/validation';

const router = Router();

const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'login' });

// Hash dummy usado quando o email nao existe, para que bcrypt.compare SEMPRE
// rode e o tempo de resposta nao revele se um email tem conta cadastrada.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('senha-de-tempo-constante', 12);

router.post('/auth/login', loginRateLimit, async (req, res) => {
  const { email, password } = req.body as { email?: unknown; password?: unknown };

  if (!isValidEmail(email) || !isNonEmptyString(password)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Informe email e senha validos.' } });
    return;
  }

  const admin = await Admin.findOne({ email: email.trim().toLowerCase(), active: true }).select('+passwordHash');
  // Sempre roda bcrypt.compare, mesmo sem admin encontrado, comparando contra
  // um hash fixo: evita que o tempo de resposta revele se o email existe.
  const passwordMatches = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!admin || !passwordMatches) {
    // Tentativa malsucedida e' justamente o evento que a auditoria precisa
    // registrar. O email vai junto (com o ator anonimo) para dar rastro.
    await recordAuditLog(req, {
      action: 'login',
      resource: 'auth',
      status: 'failure',
      actor: { email: email.trim().toLowerCase() },
      metadata: { reason: admin ? 'senha_incorreta' : 'admin_inexistente' },
    });
    res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email ou senha incorretos.' } });
    return;
  }

  const { session, refreshToken } = await createAuthSession(String(admin._id), req);
  const accessToken = signAccessToken({
    adminId: String(admin._id),
    sessionId: String(session._id),
    role: admin.role,
  });

  await recordAuditLog(req, {
    action: 'login',
    resource: 'auth',
    resourceId: String(session._id),
    actor: { id: String(admin._id), email: admin.email, name: admin.name },
  });

  setRefreshTokenCookie(res, refreshToken);
  res.json({ data: { accessToken, admin: toAdminDto(admin) } });
});

router.post('/auth/refresh', async (req, res) => {
  const rawToken = readRefreshTokenCookie(req.headers.cookie);
  if (!rawToken) {
    res.status(401).json({ error: { code: 'NO_REFRESH_TOKEN', message: 'Sessao ausente.' } });
    return;
  }

  const rotated = await rotateAuthSession(rawToken);
  if (!rotated) {
    // Cobre token expirado, sessao revogada e reuso de refresh token — todos
    // sinais de seguranca que merecem ficar no audit log.
    await recordAuditLog(req, {
      action: 'refresh',
      resource: 'auth',
      status: 'failure',
      metadata: { reason: 'sessao_invalida_ou_reuso' },
    });
    clearRefreshTokenCookie(res);
    res.status(401).json({ error: { code: 'SESSION_EXPIRED', message: 'Sessao invalida ou expirada.' } });
    return;
  }

  const admin = await Admin.findOne({ _id: rotated.session.adminId, active: true }).select('_id role').lean();
  if (!admin) {
    clearRefreshTokenCookie(res);
    res.status(401).json({ error: { code: 'SESSION_EXPIRED', message: 'Sessao invalida ou expirada.' } });
    return;
  }

  const accessToken = signAccessToken({
    adminId: String(admin._id),
    sessionId: String(rotated.session._id),
    role: admin.role,
  });

  setRefreshTokenCookie(res, rotated.refreshToken);
  res.json({ data: { accessToken } });
});

router.post('/auth/logout', async (req, res) => {
  const rawToken = readRefreshTokenCookie(req.headers.cookie);
  const revoked = rawToken ? await revokeSessionByRefreshToken(rawToken, 'logout') : undefined;
  if (revoked) {
    await recordAuditLog(req, {
      action: 'logout',
      resource: 'auth',
      resourceId: revoked.sessionId,
      actor: { id: revoked.adminId },
    });
  }
  clearRefreshTokenCookie(res);
  res.json({ data: { loggedOut: true } });
});

router.get('/auth/me', protect, async (req: AuthRequest, res) => {
  const admin = await Admin.findById(req.adminId).lean();
  if (!admin) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Administrador nao encontrado.' } });
    return;
  }
  res.json({ data: toAdminDto(admin) });
});

export default router;
