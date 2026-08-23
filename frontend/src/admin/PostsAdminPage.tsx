import { useEffect, useState, type FormEvent } from 'react';
import { adminApi } from '../api/admin';
import { ApiError } from '../api/client';
import { PaginationControls } from '../components/PaginationControls';
import { useAuth } from '../context/AuthContext';
import { routes } from '../routing';
import { navigate } from '../navigation';
import { slugify } from '../utils/slugify';
import type { PostDto } from '../api/types';

type Props = { mode: 'list' | 'new' | 'edit'; id?: string };

const PAGE_SIZE = 20;

export function PostsAdminPage({ mode, id }: Props) {
  const { accessToken } = useAuth();
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (mode !== 'list' || !accessToken) return;
    adminApi
      .listPosts(accessToken, page, PAGE_SIZE)
      .then((result) => {
        setPosts(result.items);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      })
      .catch((error) => {
        setLoadError(error instanceof ApiError ? error.message : 'Falha ao carregar os conteúdos.');
      });
  }, [mode, accessToken, page]);

  if (!accessToken) return null;

  if (mode === 'list') {
    return (
      <div>
        <h1>Conteúdos</h1>
        <a href={routes.adminPostsNew}>Novo conteúdo</a>
        {loadError && <p role="alert">{loadError}</p>}
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <a href={routes.adminPostsEdit(post.id)}>{post.title}</a>
              <button
                onClick={async () => {
                  await adminApi.deletePost(post.id, accessToken);
                  setPosts((prev) => prev.filter((item) => item.id !== post.id));
                  setTotal((prev) => Math.max(0, prev - 1));
                }}
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      </div>
    );
  }

  return <PostForm mode={mode} id={id} accessToken={accessToken} />;
}

function PostForm({ mode, id, accessToken }: { mode: 'new' | 'edit'; id?: string; accessToken: string }) {
  const [post, setPost] = useState<PostDto | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  // Título e slug são controlados porque um alimenta o outro; os demais campos
  // seguem sem estado, lidos do FormData no submit.
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  // Enquanto ninguém editar o slug na mão, ele acompanha o título.
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && id) {
      adminApi.getPost(id, accessToken).then((loaded) => {
        setPost(loaded);
        setTitle(loaded.title);
        setSlug(loaded.slug);
      });
    }
  }, [mode, id, accessToken]);

  function handleTitleChange(value: string) {
    setTitle(value);
    // Só na criação. Num post já publicado o slug é a URL divulgada: deixá-lo
    // seguir o título mataria em silêncio todo link existente — este projeto
    // não tem redirect 301 do slug antigo para o novo.
    if (mode === 'new' && !slugEdited) setSlug(slugify(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      title,
      slug,
      excerpt: String(form.get('excerpt') ?? ''),
      content: String(form.get('content')),
      published: form.get('published') === 'on',
    };

    setErrorMessage('');
    try {
      if (mode === 'new') {
        await adminApi.createPost(payload, accessToken);
      } else if (id) {
        await adminApi.updatePost(id, payload, accessToken);
      }
      navigate(routes.adminPosts);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Erro inesperado ao salvar.');
    }
  }

  if (mode === 'edit' && !post) return <p>Carregando...</p>;

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label>
        Título
        <input
          name="title"
          value={title}
          onChange={(event) => handleTitleChange(event.target.value)}
          required
        />
      </label>
      <label>
        Slug
        <input
          name="slug"
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugEdited(true);
          }}
          aria-describedby="slug-hint"
          required
        />
      </label>
      {/* Fora do <label> de propósito: dentro, o texto entraria no nome
          acessível do campo ("Slug ..."), quebrando leitor de tela e seletor. */}
      <small id="slug-hint">
        {mode === 'new'
          ? `Endereço do conteúdo: /conteudos/${slug || 'gerado-a-partir-do-titulo'}`
          : 'Mudar o slug troca o endereço público e quebra links já compartilhados.'}
      </small>
      <label>
        Resumo
        <input name="excerpt" defaultValue={post?.excerpt} />
      </label>
      <label>
        Conteúdo
        <textarea name="content" defaultValue={post?.content} required />
      </label>
      <label>
        Publicado
        <input name="published" type="checkbox" defaultChecked={post?.published} />
      </label>
      <button type="submit">Salvar</button>
      {errorMessage && <p role="alert">{errorMessage}</p>}
    </form>
  );
}
