import type { Request } from 'express';
import { getRefreshTokenTtlMs, getSessionIdleTtlMs } from '../config/env';
import AuthSession from '../models/AuthSession';
import {
  createRefreshSecret,
  formatRefreshToken,
  hashRefreshSecret,
  parseRefreshToken,
} from './tokens';

export async function createAuthSession(adminId: string, req: Request) {
  const secret = createRefreshSecret();
  const now = new Date();
  const session = new AuthSession({
    adminId,
    refreshTokenHash: hashRefreshSecret(secret),
    expiresAt: new Date(now.getTime() + getRefreshTokenTtlMs()),
    lastUsedAt: now,
    ip: (req.ip ?? req.socket.remoteAddress)?.slice(0, 100),
    userAgent: req.get('user-agent')?.slice(0, 500),
  });
  await session.save();
  return { session, refreshToken: formatRefreshToken(String(session._id), secret) };
}

export async function rotateAuthSession(rawToken: string) {
  const parsed = parseRefreshToken(rawToken);
  if (!parsed) return undefined;

  const now = new Date();
  const idleCutoff = new Date(now.getTime() - getSessionIdleTtlMs());
  const nextSecret = createRefreshSecret();
  const session = await AuthSession.findOneAndUpdate(
    {
      _id: parsed.sessionId,
      refreshTokenHash: hashRefreshSecret(parsed.secret),
      revokedAt: { $exists: false },
      expiresAt: { $gt: now },
      lastUsedAt: { $gt: idleCutoff },
    },
    {
      $set: {
        refreshTokenHash: hashRefreshSecret(nextSecret),
        lastUsedAt: now,
      },
    },
    { returnDocument: 'after' },
  );

  if (session) {
    return {
      session,
      refreshToken: formatRefreshToken(String(session._id), nextSecret),
    };
  }

  const reusedSession = await AuthSession.findById(parsed.sessionId).select('+refreshTokenHash');
  if (reusedSession && !reusedSession.revokedAt && reusedSession.expiresAt > now) {
    reusedSession.revokedAt = now;
    reusedSession.revocationReason =
      reusedSession.lastUsedAt <= idleCutoff ? 'idle_timeout' : 'refresh_token_reuse';
    await reusedSession.save();
  }
  return undefined;
}

/**
 * Revoga a sessao do refresh token informado. Devolve quem era o dono para que
 * o chamador possa auditar o evento (o logout nao passa pelo `protect`, entao
 * essa e' a unica forma de saber de quem foi a sessao encerrada).
 */
export async function revokeSessionByRefreshToken(
  rawToken: string,
  reason: string,
): Promise<{ sessionId: string; adminId: string } | undefined> {
  const parsed = parseRefreshToken(rawToken);
  if (!parsed) return undefined;
  const session = await AuthSession.findOneAndUpdate(
    {
      _id: parsed.sessionId,
      refreshTokenHash: hashRefreshSecret(parsed.secret),
      revokedAt: { $exists: false },
    },
    { $set: { revokedAt: new Date(), revocationReason: reason } },
  ).select('_id adminId');

  if (!session) return undefined;
  return { sessionId: String(session._id), adminId: String(session.adminId) };
}

