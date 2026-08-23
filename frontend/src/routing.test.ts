import { describe, expect, it } from 'vitest';
import { getRoute, normalizePathname } from './routing';

describe('normalizePathname', () => {
  it('remove barras finais', () => {
    expect(normalizePathname('/sobre/')).toBe('/sobre');
  });

  it('mantem a raiz como /', () => {
    expect(normalizePathname('/')).toBe('/');
  });
});

describe('getRoute', () => {
  it('identifica a home', () => {
    expect(getRoute('/')).toEqual({ kind: 'home', path: '/' });
  });

  it('identifica um post pelo slug', () => {
    expect(getRoute('/conteudos/meu-post')).toEqual({
      kind: 'post',
      path: '/conteudos/meu-post',
      slug: 'meu-post',
    });
  });

  it('identifica edicao de post no admin', () => {
    expect(getRoute('/admin/conteudos/abc123')).toEqual({
      kind: 'admin-posts',
      path: '/admin/conteudos/abc123',
      mode: 'edit',
      id: 'abc123',
    });
  });

  it('retorna not-found para caminhos desconhecidos', () => {
    expect(getRoute('/rota-inexistente')).toEqual({ kind: 'not-found', path: '/rota-inexistente' });
  });

  it('identifica a pagina de imagens do admin', () => {
    expect(getRoute('/admin/imagens')).toEqual({ kind: 'admin-images', path: '/admin/imagens' });
  });

  it('identifica auditoria e mensagens do admin', () => {
    expect(getRoute('/admin/auditoria')).toEqual({ kind: 'admin-audit', path: '/admin/auditoria' });
    expect(getRoute('/admin/mensagens')).toEqual({
      kind: 'admin-contact-messages',
      path: '/admin/mensagens',
    });
  });
});

describe('getRoute com o blog desligado', () => {
  const BLOG_ENABLED = false;

  it('trata as rotas públicas de conteúdo como not-found', () => {
    expect(getRoute('/conteudos', BLOG_ENABLED).kind).toBe('not-found');
    expect(getRoute('/conteudos/algum-post', BLOG_ENABLED).kind).toBe('not-found');
  });

  it('trata as rotas administrativas de conteúdo como not-found', () => {
    expect(getRoute('/admin/conteudos', BLOG_ENABLED).kind).toBe('not-found');
    expect(getRoute('/admin/conteudos/novo', BLOG_ENABLED).kind).toBe('not-found');
    expect(getRoute('/admin/conteudos/507f1f77bcf86cd799439011', BLOG_ENABLED).kind).toBe('not-found');
  });

  it('mantém as demais rotas funcionando', () => {
    expect(getRoute('/', BLOG_ENABLED).kind).toBe('home');
    expect(getRoute('/contato', BLOG_ENABLED).kind).toBe('contact');
    expect(getRoute('/admin/auditoria', BLOG_ENABLED).kind).toBe('admin-audit');
    expect(getRoute('/admin/mensagens', BLOG_ENABLED).kind).toBe('admin-contact-messages');
  });
});
