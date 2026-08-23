/**
 * Erros que middlewares (body-parser, principalmente) marcam com status 4xx.
 *
 * Sem esta traducao eles caem no `catch` generico e viram **500**: JSON
 * malformado, corpo acima do limite ou charset nao suportado passariam a
 * impressao de bug do servidor, poluiriam o alerta de erro e ainda dariam ao
 * cliente uma mensagem que nao ajuda a corrigir a requisicao.
 */
export type ClientError = {
  status: number;
  code: string;
  message: string;
};

const PARSER_ERRORS: Record<string, { code: string; message: string }> = {
  'entity.parse.failed': {
    code: 'INVALID_JSON',
    message: 'O corpo da requisicao nao e um JSON valido.',
  },
  'entity.too.large': {
    code: 'PAYLOAD_TOO_LARGE',
    message: 'O corpo da requisicao excede o limite permitido.',
  },
  'encoding.unsupported': {
    code: 'INVALID_INPUT',
    message: 'Codificacao do corpo da requisicao nao suportada.',
  },
};

export function toClientError(error: unknown): ClientError | undefined {
  if (typeof error !== 'object' || error === null) return undefined;

  const candidate = error as { status?: unknown; statusCode?: unknown; type?: unknown };
  const raw = typeof candidate.status === 'number' ? candidate.status : candidate.statusCode;
  if (typeof raw !== 'number' || raw < 400 || raw > 499) return undefined;

  const known = typeof candidate.type === 'string' ? PARSER_ERRORS[candidate.type] : undefined;
  return {
    status: raw,
    code: known?.code ?? 'INVALID_INPUT',
    message: known?.message ?? 'A requisicao contem campos invalidos.',
  };
}
