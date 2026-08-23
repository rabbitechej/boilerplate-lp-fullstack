type Props = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function PaginationControls({ page, totalPages, total, onPageChange }: Props) {
  if (totalPages <= 1) {
    return total > 0 ? <p className="pagination-meta">{total} itens</p> : null;
  }

  return (
    <div className="pagination">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </button>
      <span>
        Página {page} de {totalPages} ({total} itens)
      </span>
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Próxima
      </button>
    </div>
  );
}
