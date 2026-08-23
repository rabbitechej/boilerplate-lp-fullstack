import type { NextFunction, Request, Response } from 'express';
import { getSessionIdleTtlMs } from '../config/env';
import { verifyAccessToken } from '../auth/tokens';
import Admin, { type AdminRole } from '../models/Admin';
import AuthSession from '../models/AuthSession';
import { updateRequestContext } from '../utils/requestContext';

export interface AuthRequest extends Request {
  adminId?: string;
  adminRole?: AdminRole;
  adminEmail?: string;
  adminName?: string;
  sessionId?: string;
}

export async function protect(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const [scheme, token, extra] = req.headers.authorization?.trim().split(/\s+/) ?? [];
  if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Acesso negado. Faca login para continuar.' } });
    return;
  }

  try {
    const claims = verifyAccessToken(token);
    const now = new Date();
    const idleCutoff = new Date(now.getTime() - getSessionIdleTtlMs());
    const [session, admin] = await Promise.all([
      AuthSession.findOneAndUpdate(
        {
          _id: claims.sessionId,
          adminId: claims.adminId,
          revokedAt: { $exists: false },
          expiresAt: { $gt: now },
          lastUsedAt: { $gt: idleCutoff },
        },
        { $set: { lastUsedAt: now } },
        { returnDocument: 'after' },
      ).select('_id'),
      Admin.findOne({ _id: claims.adminId, active: true }).select('_id role email name').lean(),
    ]);

    if (!session || !admin) {
      res.status(401).json({ error: { code: 'SESSION_EXPIRED', message: 'Sessao invalida ou expirada.' } });
      return;
    }

    req.adminId = claims.adminId;
    req.adminRole = admin.role as AdminRole;
    req.adminEmail = admin.email;
    req.adminName = admin.name;
    req.sessionId = claims.sessionId;
    // A partir daqui todo log da requisicao sai identificado com o admin.
    updateRequestContext({ adminId: claims.adminId, adminEmail: admin.email });
    next();
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token invalido ou expirado.' } });
  }
}

export function requireRole(...roles: AdminRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.adminRole || !roles.includes(req.adminRole)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Voce nao possui permissao para esta operacao.' } });
      return;
    }
    next();
  };
}
