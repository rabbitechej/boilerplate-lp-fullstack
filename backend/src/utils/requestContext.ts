import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto propagado por requisicao (via AsyncLocalStorage). Permite que
 * qualquer ponto do codigo — inclusive utilitarios sem acesso ao `req` —
 * escreva logs correlacionados com a requisicao que os originou.
 */
export type RequestContext = {
  requestId: string;
  adminId?: string;
  adminEmail?: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/**
 * Enriquece o contexto da requisicao em andamento (ex.: o `protect` adiciona o
 * admin autenticado depois que o requestId ja foi criado). No-op fora de uma
 * requisicao.
 */
export function updateRequestContext(patch: Partial<RequestContext>): void {
  const current = storage.getStore();
  if (current) Object.assign(current, patch);
}
