import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { PaginationControls } from '../components/PaginationControls';
import { routes } from '../routing';
import type { Paginated, PublicPostDto } from '../api/types';

const PAGE_SIZE = 20;

export function PostsPage() {
  const [posts, setPosts] = useState<PublicPostDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<Paginated<PublicPostDto>>(`/posts?page=${page}&limit=${PAGE_SIZE}`)
      .then((result) => {
        setPosts(result.items);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      })
      .catch(() => {
        setPosts([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <h1>Conteúdos</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <a href={routes.post(post.slug)}>{post.title}</a>
          </li>
        ))}
      </ul>
      <PaginationControls page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>
  );
}
