import type { ReactNode } from 'react';
import { Brand } from './Brand';
import { features } from '../config/features';
import { routes } from '../routing';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="layout">
      <header className="layout__header">
        <a href={routes.home}>
          <Brand />
        </a>
        <nav className="layout__nav">
          <a href={routes.home}>Início</a>
          <a href={routes.about}>Sobre</a>
          {features.blog && <a href={routes.posts}>Conteúdos</a>}
          <a href={routes.contact}>Contato</a>
        </nav>
      </header>
      <main className="layout__main">{children}</main>
      <footer className="layout__footer">
        <p>&copy; {new Date().getFullYear()} Sua marca. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
