import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { NextFunction, Response } from 'express';
import { requireRole, type AuthRequest } from './authMiddleware';
import type { AdminRole } from '../models/Admin';

type Captured = { status?: number; body?: unknown };

function fakeResponse(captured: Captured): Response {
  return {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    },
  } as unknown as Response;
}

function run(role: AdminRole | undefined, allowed: AdminRole[]) {
  const captured: Captured = {};
  let nextCalls = 0;
  const next: NextFunction = () => {
    nextCalls += 1;
  };

  requireRole(...allowed)({ adminRole: role } as AuthRequest, fakeResponse(captured), next);
  return { captured, nextCalls };
}

describe('requireRole', () => {
  it('libera quando o perfil esta na lista', () => {
    const { nextCalls, captured } = run('admin', ['admin']);
    assert.equal(nextCalls, 1);
    assert.equal(captured.status, undefined);
  });

  it('bloqueia com 403 quando a requisicao nao tem perfil', () => {
    const { nextCalls, captured } = run(undefined, ['admin']);
    assert.equal(nextCalls, 0);
    assert.equal(captured.status, 403);
    assert.equal((captured.body as { error: { code: string } }).error.code, 'FORBIDDEN');
  });

  it('bloqueia perfil fora da lista permitida', () => {
    // Simula um token antigo (ou forjado) com um perfil que nao existe mais.
    const { nextCalls, captured } = run('editor' as AdminRole, ['admin']);
    assert.equal(nextCalls, 0);
    assert.equal(captured.status, 403);
  });
});
