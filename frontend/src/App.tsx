import { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { PostsPage } from './pages/PostsPage';
import { PostPage } from './pages/PostPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LoginPage } from './admin/LoginPage';
import { AdminPortal } from './admin/AdminPortal';
import { PostsAdminPage } from './admin/PostsAdminPage';
import { ImagesPage } from './admin/ImagesPage';
import { AuditLogsPage } from './admin/AuditLogsPage';
import { ContactMessagesPage } from './admin/ContactMessagesPage';
import { getRoute } from './routing';

export function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    // Intercepta cliques em links internos para navegar via history.pushState,
    // sem isso TODO link causaria reload completo da pagina e perderia o
    // accessToken (guardado so' em memoria, de proposito, fora do localStorage).
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('/') || anchor.target) return;

      event.preventDefault();
      window.history.pushState({}, '', href);
      // Usa window.location.pathname (e nao o "href" cru) para ficar
      // consistente com o estado inicial e o listener de popstate: getRoute()
      // espera so' o pathname, sem query string nem hash.
      setPathname(window.location.pathname);
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const route = getRoute(pathname);

  // AuthProvider precisa envolver TODAS as rotas administrativas (login +
  // painel) numa unica instancia estavel na arvore — senao o accessToken
  // obtido no login se perde ao navegar para o painel, porque seriam dois
  // contextos React diferentes.
  const isAdminRoute =
    route.kind === 'admin-login' ||
    route.kind === 'admin-dashboard' ||
    route.kind === 'admin-posts' ||
    route.kind === 'admin-images' ||
    route.kind === 'admin-audit' ||
    route.kind === 'admin-contact-messages';

  if (isAdminRoute) {
    return (
      <AuthProvider>
        {route.kind === 'admin-login' ? (
          <LoginPage />
        ) : (
          <AdminPortal>
            {route.kind === 'admin-posts' && <PostsAdminPage mode={route.mode} id={route.id} />}
            {route.kind === 'admin-images' && <ImagesPage />}
            {route.kind === 'admin-audit' && <AuditLogsPage />}
            {route.kind === 'admin-contact-messages' && <ContactMessagesPage />}
            {route.kind === 'admin-dashboard' && <p>Bem-vindo ao painel administrativo.</p>}
          </AdminPortal>
        )}
      </AuthProvider>
    );
  }

  return (
    <Layout>
      {route.kind === 'home' && <HomePage />}
      {route.kind === 'about' && <AboutPage />}
      {route.kind === 'contact' && <ContactPage />}
      {route.kind === 'posts' && <PostsPage />}
      {route.kind === 'post' && <PostPage slug={route.slug} />}
      {route.kind === 'not-found' && <NotFoundPage />}
    </Layout>
  );
}
