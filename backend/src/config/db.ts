import mongoose from 'mongoose';
import { requireEnv } from './env';
import Admin from '../models/Admin';
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
  await Promise.all([Admin.createIndexes(), Post.createIndexes(), RateLimit.createIndexes()]);
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
