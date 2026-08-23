import type { Request } from 'express';
import { Types } from 'mongoose';
import AuditLog, { AUDIT_STATUSES, type AuditStatus } from '../models/AuditLog';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { logger } from './logger';
import { getRequestContext } from './requestContext';

export type { AuditStatus };

const auditLogger = logger.child({ channel: 'audit' });

export type AuditEventInput = {
  action: string;
  resource: string;
  resourceId?: string;
  status?: AuditStatus;
  metadata?: Record<string, unknown>;
  /** Sobrescreve o ator quando nao ha sessao autenticada (ex.: login falho). */
  actor?: { id?: string; email?: string; name?: string };
};

export type AuditEntry = {
  adminId?: string;
  adminEmail?: string;
  adminName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  status: AuditStatus;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Monta a entrada de auditoria a partir da requisicao (ator, IP, user-agent,
 * requestId). Funcao pura — o `recordAuditLog` cuida da persistencia.
 */
export function buildAuditEntry(req: Request | undefined, input: AuditEventInput): AuditEntry {
  const authRequest = req as AuthRequest | undefined;
  const context = getRequestContext();

  const adminId = input.actor?.id ?? authRequest?.adminId ?? context?.adminId;
  const adminEmail = input.actor?.email ?? authRequest?.adminEmail ?? context?.adminEmail;
  const adminName = input.actor?.name ?? authRequest?.adminName;

  return {
    ...(adminId ? { adminId } : {}),
    ...(adminEmail ? { adminEmail: adminEmail.toLowerCase() } : {}),
    ...(adminName ? { adminName } : {}),
    action: input.action,
    resource: input.resource,
    ...(input.resourceId ? { resourceId: input.resourceId } : {}),
    status: input.status ?? 'success',
    ...(req?.ip ? { ip: req.ip.slice(0, 100) } : {}),
    ...(req?.get('user-agent') ? { userAgent: req.get('user-agent')!.slice(0, 500) } : {}),
    ...(context?.requestId ? { requestId: context.requestId } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };
}

/**
 * Registra um evento administrativo em dois lugares: no stream de logs (sempre,
 * mesmo que o banco esteja fora) e na colecao `auditlogs` (consultavel pelo
 * painel). Nunca lanca — auditoria nao pode derrubar a operacao auditada.
 */
export async function recordAuditLog(
  req: Request | undefined,
  input: AuditEventInput,
): Promise<void> {
  const entry = buildAuditEntry(req, input);

  auditLogger[entry.status === 'failure' ? 'warn' : 'info']('evento administrativo', entry);

  try {
    await AuditLog.create(entry);
  } catch (error) {
    auditLogger.error('falha ao persistir evento de auditoria', {
      err: error,
      action: entry.action,
      resource: entry.resource,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Filtros da listagem                                                        */
/* -------------------------------------------------------------------------- */

const SAFE_TERM = /^[\w.:-]{1,80}$/;

export type AuditLogFilter = {
  action?: string;
  resource?: string;
  status?: AuditStatus;
  adminId?: string;
  createdAt?: { $gte?: Date; $lte?: Date };
};

export type AuditLogFilterResult =
  | { ok: true; filter: AuditLogFilter }
  | { ok: false; message: string };

function readTerm(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return String(value).trim() || undefined;
}

/**
 * Traduz a query string da listagem em um filtro Mongo. Cada campo e' validado
 * contra um formato conhecido — nada do que o cliente envia vira operador.
 */
export function buildAuditLogFilter(query: Record<string, unknown>): AuditLogFilterResult {
  const filter: AuditLogFilter = {};

  for (const field of ['action', 'resource'] as const) {
    const term = readTerm(query[field]);
    if (term === undefined) continue;
    if (!SAFE_TERM.test(term)) {
      return { ok: false, message: `Filtro '${field}' invalido.` };
    }
    filter[field] = term;
  }

  const status = readTerm(query.status);
  if (status !== undefined) {
    if (!(AUDIT_STATUSES as readonly string[]).includes(status)) {
      return { ok: false, message: `Filtro 'status' invalido. Use: ${AUDIT_STATUSES.join(', ')}.` };
    }
    filter.status = status as AuditStatus;
  }

  const adminId = readTerm(query.adminId);
  if (adminId !== undefined) {
    if (!Types.ObjectId.isValid(adminId)) {
      return { ok: false, message: "Filtro 'adminId' invalido." };
    }
    filter.adminId = adminId;
  }

  const range: { $gte?: Date; $lte?: Date } = {};
  const from = readTerm(query.from);
  if (from !== undefined) {
    const date = new Date(from);
    if (Number.isNaN(date.getTime())) return { ok: false, message: "Filtro 'from' invalido." };
    range.$gte = date;
  }

  const to = readTerm(query.to);
  if (to !== undefined) {
    const date = new Date(to);
    if (Number.isNaN(date.getTime())) return { ok: false, message: "Filtro 'to' invalido." };
    range.$lte = date;
  }

  if (range.$gte && range.$lte && range.$gte > range.$lte) {
    return { ok: false, message: "Filtro de periodo invalido: 'from' e posterior a 'to'." };
  }
  if (range.$gte || range.$lte) filter.createdAt = range;

  return { ok: true, filter };
}
