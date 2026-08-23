import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { isBlogEnabled } from '../config/env';
import Post from '../models/Post';
import { logger } from '../utils/logger';

const SAMPLE_POSTS = [
  {
    title: 'Bem-vindo ao boilerplate',
    slug: 'bem-vindo-ao-boilerplate',
    excerpt: 'Primeiro conteudo de exemplo, criado pelo script de seed.',
    content: 'Este e um conteudo de exemplo. Edite ou remova pelo painel administrativo.',
    published: true,
  },
  {
    title: 'Como personalizar este projeto',
    slug: 'como-personalizar-este-projeto',
    excerpt: 'Dicas rapidas para adaptar o boilerplate ao seu caso de uso.',
    content: 'Troque a marca, ajuste as paginas e configure as variaveis de ambiente.',
    published: true,
  },
  {
    title: 'Rascunho ainda nao publicado',
    slug: 'rascunho-ainda-nao-publicado',
    excerpt: 'Exemplo de conteudo com published=false.',
    content: 'Este conteudo nao aparece na listagem publica.',
    published: false,
  },
];

async function run(): Promise<void> {
  if (!isBlogEnabled()) {
    // Sem as rotas montadas, semear posts so' deixaria lixo no banco.
    logger.warn('seed ignorado: o modulo de blog esta desligado (ENABLE_BLOG=false)');
    return;
  }

  await connectDatabase();

  for (const post of SAMPLE_POSTS) {
    await Post.findOneAndUpdate({ slug: post.slug }, post, { upsert: true });
  }

  logger.info('seed concluido', { posts: SAMPLE_POSTS.length });
  await disconnectDatabase();
}

run().catch((error) => {
  logger.error('erro ao executar o seed', { err: error });
  process.exit(1);
});
