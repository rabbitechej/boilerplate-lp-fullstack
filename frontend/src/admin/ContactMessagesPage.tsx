import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin';
import { ApiError } from '../api/client';
import { PaginationControls } from '../components/PaginationControls';
import { useAuth } from '../context/AuthContext';
import type { ContactMessageDto } from '../api/types';

const PAGE_SIZE = 20;

export function ContactMessagesPage() {
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState<ContactMessageDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    adminApi
      .listContactMessages(accessToken, page, PAGE_SIZE)
      .then((result) => {
        setMessages(result.items);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      })
      .catch((error) => {
        setLoadError(
          error instanceof ApiError ? error.message : 'Falha ao carregar as mensagens de contato.',
        );
      });
  }, [accessToken, page]);

  if (!accessToken) return null;

  return (
    <div>
      <h1>Mensagens de contato</h1>
      {loadError && <p role="alert">{loadError}</p>}
      <ul>
        {messages.map((entry) => (
          <li key={entry.id}>
            <strong>{entry.name}</strong> ({entry.email}) —{' '}
            {new Date(entry.createdAt).toLocaleString('pt-BR')}
            <p>{entry.message}</p>
          </li>
        ))}
      </ul>
      {!loadError && messages.length === 0 && <p>Nenhuma mensagem recebida.</p>}
      <PaginationControls page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>
  );
}
