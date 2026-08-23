import { features } from './config/features';

export const routes = {
  home: '/',
  about: '/sobre',
  contact: '/contato',
  posts: '/conteudos',
  post: (slug: string) => `/conteudos/${slug}`,
  adminLogin: '/admin/login',
  adminDashboard: '/admin',
  adminPosts: '/admin/conteudos',
  adminPostsNew: '/admin/conteudos/novo',
  adminPostsEdit: (id: string) => `/admin/conteudos/${encodeURIComponent(id)}`,
  adminImages: '/admin/imagens',
  adminAudit: '/admin/auditoria',
  adminContactMessages: '/admin/mensagens',
};

export type AppRoute =
  | { kind: 'home'; path: string }
  | { kind: 'about'; path: string }
  | { kind: 'contact'; path: string }
  | { kind: 'posts'; path: string }
  | { kind: 'post'; path: string; slug: string }
  | { kind: 'admin-login'; path: string }
  | { kind: 'admin-dashboard'; path: string }
  | { kind: 'admin-posts'; path: string; mode: 'list' | 'new' | 'edit'; id?: string }
  | { kind: 'admin-images'; path: string }
  | { kind: 'admin-audit'; path: string }
  | { kind: 'admin-contact-messages'; path: string }
  | { kind: 'not-found'; path: string };

export function normalizePathname(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

/**
 * `blogEnabled` é parâmetro (e não leitura direta da flag) para os testes
 * conseguirem exercitar os dois modos sem rebuildar o bundle.
 * Com o blog desligado, as rotas de conteúdo caem em `not-found` — o mesmo que
 * o backend faz ao não montar as rotas de posts.
 */
export function getRoute(pathname: string, blogEnabled: boolean = features.blog): AppRoute {
  const path = normalizePathname(pathname);

  if (path === routes.home) return { kind: 'home', path };
  if (path === routes.about) return { kind: 'about', path };
  if (path === routes.contact) return { kind: 'contact', path };
  if (path === routes.adminLogin) return { kind: 'admin-login', path };
  if (path === routes.adminDashboard) return { kind: 'admin-dashboard', path };
  if (path === routes.adminImages) return { kind: 'admin-images', path };
  if (path === routes.adminAudit) return { kind: 'admin-audit', path };
  if (path === routes.adminContactMessages) return { kind: 'admin-contact-messages', path };

  if (blogEnabled) {
    if (path === routes.posts) return { kind: 'posts', path };
    if (path === routes.adminPosts) return { kind: 'admin-posts', path, mode: 'list' };
    if (path === routes.adminPostsNew) return { kind: 'admin-posts', path, mode: 'new' };

    const adminEditMatch = path.match(/^\/admin\/conteudos\/([^/]+)$/);
    if (adminEditMatch) {
      return { kind: 'admin-posts', path, mode: 'edit', id: decodeURIComponent(adminEditMatch[1] ?? '') };
    }

    const postMatch = path.match(/^\/conteudos\/([^/]+)$/);
    if (postMatch) {
      const slug = decodeURIComponent(postMatch[1] ?? '').toLowerCase();
      if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return { kind: 'post', path, slug };
      }
    }
  }

  return { kind: 'not-found', path };
}

