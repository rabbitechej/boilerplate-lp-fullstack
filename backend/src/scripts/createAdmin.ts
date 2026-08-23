import 'dotenv/config';
import bcrypt from 'bcrypt';
import { connectDatabase, disconnectDatabase } from '../config/db';
import Admin from '../models/Admin';
import { logger } from '../utils/logger';
import { isValidEmail, isNonEmptyString } from '../utils/validation';

async function run(): Promise<void> {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!isNonEmptyString(name) || !isValidEmail(email) || !isNonEmptyString(password) || password.length < 8) {
    throw new Error(
      'Defina ADMIN_NAME, ADMIN_EMAIL (valido) e ADMIN_PASSWORD (>= 8 caracteres) no .env antes de rodar este script.',
    );
  }

  await connectDatabase();

  const existing = await Admin.findOne({ email: email.trim().toLowerCase() });
  if (existing) {
    logger.info('ja existe um administrador com esse email', { email });
    await disconnectDatabase();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await Admin.create({
    name,
    email: email.trim().toLowerCase(),
    passwordHash,
    role: 'admin',
    active: true,
  });

  logger.info('administrador criado', { email: admin.email, id: String(admin._id) });
  await disconnectDatabase();
}

run().catch((error) => {
  logger.error('erro ao criar administrador', { err: error });
  process.exit(1);
});
