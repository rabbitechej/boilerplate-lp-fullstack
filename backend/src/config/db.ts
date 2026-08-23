import mongoose from 'mongoose';
import { requireEnv } from './env';
import Admin from '../models/Admin';
import AuditLog from '../models/AuditLog';
import AuthSession from '../models/AuthSession';
import Post from '../models/Post';
import RateLimit from '../models/RateLimit';

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(requireEnv('MONGODB_URI'));
  await ensureRequiredIndexes();
}

async function ensureRequiredIndexes(): Promise<void> {
  // Garante os indices unicos (Admin.email, Post.slug, RateLimit.key) antes de
  // aceitar trafego, independente do autoIndex do Mongoose estar habilitado.
  // O RateLimit tambem depende do TTL em expiresAt para manter a colecao pequena.
  // O AuditLog depende dos indices de ordenacao/filtro da tela de auditoria e
  // a AuthSession do TTL em expiresAt para nao acumular sessao vencida.
  await Promise.all([
    Admin.createIndexes(),
    Post.createIndexes(),
    RateLimit.createIndexes(),
    AuditLog.createIndexes(),
    AuthSession.createIndexes(),
  ]);
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
