import { Schema, Types, model, type InferSchemaType } from 'mongoose';

/**
 * Perfis aceitos no painel. O boilerplate comeca com um so' — `admin` — e
 * `requireRole` ja' esta espalhado pelas rotas como ponto de extensao: para
 * criar um cargo novo, acrescente aqui e ajuste as rotas que ele pode acessar.
 * O passo a passo completo esta na secao 9.1 do README.
 */
export const ADMIN_ROLES = ['admin'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

const adminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 200 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ADMIN_ROLES, default: 'admin' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type IAdmin = InferSchemaType<typeof adminSchema> & { _id: Types.ObjectId };

export default model('Admin', adminSchema);
