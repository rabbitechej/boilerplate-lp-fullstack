import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { adminApi } from '../api/admin';
import { ApiError } from '../api/client';
import { PaginationControls } from '../components/PaginationControls';
import { useAuth } from '../context/AuthContext';
import type { AuditLogDto, AuditLogFilters } from '../api/types';

const PAGE_SIZE = 20;

const EMPTY_FILTERS: AuditLogFilters = { action: '', resource: '', status: '', from: '', to: '' };

// Sugestões (não restrições): o campo é livre para cobrir recursos que você
// adicionar depois sem precisar mexer nesta tela.
const KNOWN_ACTIONS = ['login', 'logout', 'refresh', 'create', 'update', 'delete', 'upload'];
const KNOWN_RESOURCES = ['auth', 'post', 'image'];

/**
 * `datetime-local` devolve "2026-01-02T03:04", sem fuso. Enviado assim, o
 * backend interpretaria no fuso do servidor (normalmente UTC) e o período sairia
 * deslocado. Converte para ISO com fuso usando o relógio de quem está filtrando.
 */
function toIsoInstant(value: string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function describeActor(log: AuditLogDto): string {
  if (log.adminName && log.adminEmail) return `${log.adminName} (${log.adminEmail})`;
  return log.adminName ?? log.adminEmail ?? log.adminId ?? 'anônimo';
}

export function AuditLogsPage() {
  const { accessToken } = useAuth();
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState('');
  // `form` é o que está na tela; `filters` é o que já foi aplicado — separar os
  // dois evita uma requisição a cada tecla digitada.
  const [form, setForm] = useState<AuditLogFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<AuditLogFilters>(EMPTY_FILTERS);

  const hasFilters = useMemo(() => Object.values(filters).some(Boolean), [filters]);

  useEffect(() => {
    if (!accessToken) return;
    adminApi
      .listAuditLogs(accessToken, page, PAGE_SIZE, filters)
      .then((result) => {
        setLogs(result.items);
        setTotalPages(result.totalPages);
        setTotal(result.total);
        setLoadError('');
      })
      .catch((error) => {
        setLoadError(error instanceof ApiError ? error.message : 'Falha ao carregar o audit log.');
      });
  }, [accessToken, page, filters]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setFilters({ ...form, from: toIsoInstant(form.from), to: toIsoInstant(form.to) });
  }

  function clearFilters() {
    setPage(1);
    setForm(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
  }

  function update(field: keyof AuditLogFilters, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  if (!accessToken) return null;

  return (
    <div>
      <h1>Audit log</h1>
      <p className="pagination-meta">
        Registro de quem fez o quê no painel — incluindo tentativas de login malsucedidas.
      </p>

      <form className="filters" onSubmit={applyFilters}>
        <label>
          Ação
          <input
            list="audit-actions"
            value={form.action ?? ''}
            onChange={(event) => update('action', event.target.value)}
            placeholder="todas"
          />
        </label>
        <datalist id="audit-actions">
          {KNOWN_ACTIONS.map((action) => (
            <option key={action} value={action} />
          ))}
        </datalist>

        <label>
          Recurso
          <input
            list="audit-resources"
            value={form.resource ?? ''}
            onChange={(event) => update('resource', event.target.value)}
            placeholder="todos"
          />
        </label>
        <datalist id="audit-resources">
          {KNOWN_RESOURCES.map((resource) => (
            <option key={resource} value={resource} />
          ))}
        </datalist>

        <label>
          Resultado
          <select
            value={form.status ?? ''}
            onChange={(event) => update('status', event.target.value)}
          >
            <option value="">todos</option>
            <option value="success">sucesso</option>
            <option value="failure">falha</option>
          </select>
        </label>

        <label>
          De
          <input
            type="datetime-local"
            value={form.from ?? ''}
            onChange={(event) => update('from', event.target.value)}
          />
        </label>

        <label>
          Até
          <input
            type="datetime-local"
            value={form.to ?? ''}
            onChange={(event) => update('to', event.target.value)}
          />
        </label>

        <div className="filters__actions">
          <button type="submit">Filtrar</button>
          <button type="button" onClick={clearFilters} disabled={!hasFilters}>
            Limpar
          </button>
        </div>
      </form>

      {loadError && <p role="alert">{loadError}</p>}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Quem</th>
              <th>Ação</th>
              <th>Recurso</th>
              <th>Resultado</th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                <td>{describeActor(log)}</td>
                <td>{log.action}</td>
                <td>
                  {log.resource}
                  {log.resourceId ? ` (${log.resourceId})` : ''}
                </td>
                <td>
                  <span className={`badge badge--${log.status}`}>
                    {log.status === 'failure' ? 'falha' : 'sucesso'}
                  </span>
                </td>
                <td title={log.requestId ? `requestId: ${log.requestId}` : undefined}>
                  {log.ip ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loadError && logs.length === 0 && (
        <p>{hasFilters ? 'Nenhum evento para os filtros escolhidos.' : 'Nenhum evento registrado.'}</p>
      )}
      <PaginationControls page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>
  );
}
