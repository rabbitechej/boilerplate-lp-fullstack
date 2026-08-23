import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request } from 'express';
import { buildAuditEntry, buildAuditLogFilter } from './audit';
import { runWithRequestContext } from './requestContext';

function fakeRequest(overrides: Partial<Request> & { headers?: Record<string, string> } = {}): Request {
  const headers = overrides.headers ?? {};
  return {
    ip: '203.0.113.10',
    get: (name: string) => headers[name.toLowerCase()],
    ...overrides,
  } as unknown as Request;
}

describe('buildAuditEntry', () => {
  it('usa o admin autenticado da requisicao como ator', () => {
    const req = fakeRequest({ headers: { 'user-agent': 'vitest' } });
    Object.assign(req, { adminId: 'admin-1', adminEmail: 'Admin@Example.com', adminName: 'Admin' });

    const entry = buildAuditEntry(req, { action: 'create', resource: 'post', resourceId: 'p1' });

    assert.equal(entry.adminId, 'admin-1');
    assert.equal(entry.adminEmail, 'admin@example.com');
    assert.equal(entry.adminName, 'Admin');
    assert.equal(entry.ip, '203.0.113.10');
    assert.equal(entry.userAgent, 'vitest');
    assert.equal(entry.status, 'success');
  });

  it('aceita ator explicito quando nao ha sessao (login malsucedido)', () => {
    const entry = buildAuditEntry(fakeRequest(), {
      action: 'login',
      resource: 'auth',
      status: 'failure',
      actor: { email: 'ninguem@example.com' },
      metadata: { reason: 'admin_inexistente' },
    });

    assert.equal(entry.adminId, undefined);
    assert.equal(entry.adminEmail, 'ninguem@example.com');
    assert.equal(entry.status, 'failure');
    assert.deepEqual(entry.metadata, { reason: 'admin_inexistente' });
  });

  it('correlaciona com o requestId da requisicao em andamento', () => {
    const entry = runWithRequestContext({ requestId: 'req-42' }, () =>
      buildAuditEntry(fakeRequest(), { action: 'logout', resource: 'auth' }),
    );
    assert.equal(entry.requestId, 'req-42');
  });

  it('trunca user-agent e ip fora do limite do schema', () => {
    const entry = buildAuditEntry(
      fakeRequest({ ip: 'x'.repeat(150), headers: { 'user-agent': 'y'.repeat(600) } }),
      { action: 'create', resource: 'post' },
    );
    assert.equal(entry.ip?.length, 100);
    assert.equal(entry.userAgent?.length, 500);
  });
});

describe('buildAuditLogFilter', () => {
  it('devolve filtro vazio sem query', () => {
    const result = buildAuditLogFilter({});
    assert.ok(result.ok);
    assert.deepEqual(result.filter, {});
  });

  it('monta filtro combinando acao, recurso, status e periodo', () => {
    const result = buildAuditLogFilter({
      action: 'login',
      resource: 'auth',
      status: 'failure',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.000Z',
    });

    assert.ok(result.ok);
    assert.equal(result.filter.action, 'login');
    assert.equal(result.filter.resource, 'auth');
    assert.equal(result.filter.status, 'failure');
    assert.deepEqual(result.filter.createdAt, {
      $gte: new Date('2026-01-01T00:00:00.000Z'),
      $lte: new Date('2026-01-31T23:59:59.000Z'),
    });
  });

  it('rejeita termos com caracteres fora do formato esperado', () => {
    const result = buildAuditLogFilter({ action: { $ne: null } });
    assert.equal(result.ok, false);
  });

  it('rejeita status desconhecido', () => {
    const result = buildAuditLogFilter({ status: 'talvez' });
    assert.equal(result.ok, false);
  });

  it('rejeita adminId que nao e ObjectId', () => {
    assert.equal(buildAuditLogFilter({ adminId: 'nao-e-id' }).ok, false);
    assert.equal(buildAuditLogFilter({ adminId: '507f1f77bcf86cd799439011' }).ok, true);
  });

  it('rejeita datas invalidas e periodo invertido', () => {
    assert.equal(buildAuditLogFilter({ from: 'ontem' }).ok, false);
    assert.equal(
      buildAuditLogFilter({ from: '2026-02-01T00:00:00.000Z', to: '2026-01-01T00:00:00.000Z' }).ok,
      false,
    );
  });
});
