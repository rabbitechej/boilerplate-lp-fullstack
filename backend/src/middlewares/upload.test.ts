import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { handleUploadError } from './upload';

type Captured = { status?: number; body?: unknown; forwarded?: unknown };

function harness() {
  const captured: Captured = {};
  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    },
  } as unknown as Response;
  const next: NextFunction = ((error?: unknown) => {
    captured.forwarded = error ?? 'chamado-sem-erro';
  }) as NextFunction;
  return { captured, res, next };
}

describe('handleUploadError', () => {
  it('traduz o limite de tamanho do multer em 400 com mensagem clara', () => {
    const { captured, res, next } = harness();
    handleUploadError(new multer.MulterError('LIMIT_FILE_SIZE'), {} as Request, res, next);

    assert.equal(captured.status, 400);
    const body = captured.body as { error: { code: string; message: string } };
    assert.equal(body.error.code, 'INVALID_INPUT');
    assert.match(body.error.message, /5MB/);
  });

  it('devolve 400 para tipo de arquivo recusado pelo fileFilter', () => {
    const { captured, res, next } = harness();
    handleUploadError(new Error('Tipo de arquivo nao suportado.'), {} as Request, res, next);

    assert.equal(captured.status, 400);
    assert.equal(captured.forwarded, undefined);
  });

  it('repassa valores que nao sao Error para o error handler padrao', () => {
    const { captured, res, next } = harness();
    handleUploadError('falha estranha', {} as Request, res, next);

    assert.equal(captured.status, undefined);
    assert.equal(captured.forwarded, 'falha estranha');
  });
});
