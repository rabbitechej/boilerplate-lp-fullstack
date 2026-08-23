export type PaginationParams = {
  page: number;
  limit: number;
  skip: number;
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Lê `page` e `limit` de query string. Defaults: page=1, limit=20 (máx. 100).
 */
export function parsePagination(
  query: Record<string, unknown>,
  defaults: { page?: number; limit?: number } = {},
): PaginationParams {
  const defaultPage = defaults.page ?? 1;
  const defaultLimit = defaults.limit ?? DEFAULT_LIMIT;

  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);

  const page =
    Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : defaultPage;
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1
    ? Math.min(rawLimit, MAX_LIMIT)
    : defaultLimit;

  return { page, limit, skip: (page - 1) * limit };
}

export function toPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit) || 1),
  };
}
