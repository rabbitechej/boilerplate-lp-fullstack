import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { features } from '../config/features';
import { routes } from '../routing';
import { navigate } from '../navigation';

export function AdminPortal({ children }: { children: ReactNode }) {
  const { admin, accessToken, ensureFreshToken, logout } = useAuth();

  useEffect(() => {
    if (!accessToken) {
      ensureFreshToken().then((token) => {
        if (!token) navigate(routes.adminLogin);
      });
    }
  }, [accessToken, ensureFreshToken]);

  if (!accessToken) return <p>Verificando sessão...</p>;

  return (
    <div className="admin-shell">
      <nav className="admin-shell__nav">
        <p>Olá, {admin?.name ?? 'administrador'}</p>
        <ul>
          <li>
            <a href={routes.adminDashboard}>Painel</a>
          </li>
          {features.blog && (
            <li>
              <a href={routes.adminPosts}>Conteúdos</a>
            </li>
          )}
          <li>
            <a href={routes.adminImages}>Imagens</a>
          </li>
          <li>
            <a href={routes.adminContactMessages}>Mensagens</a>
          </li>
          <li>
            <a href={routes.adminAudit}>Auditoria</a>
          </li>
        </ul>
        <button onClick={() => logout().then(() => navigate(routes.adminLogin))}>Sair</button>
      </nav>
      <div className="admin-shell__content">{children}</div>
    </div>
  );
}
