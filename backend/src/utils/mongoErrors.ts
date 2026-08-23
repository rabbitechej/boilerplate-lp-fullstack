/**
 * Erro de validacao de schema do Mongoose. Serve de rede de seguranca no error
 * handler: se alguma rota deixar passar um payload fora do schema, o cliente
 * recebe 400 (culpa dele) em vez de 500 (que sugere bug do servidor e polui o
 * alerta de erro).
 */
export function isValidationError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'ValidationError'
  );
}

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}
