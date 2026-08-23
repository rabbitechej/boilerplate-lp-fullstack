import { Schema, Types, model, type InferSchemaType } from 'mongoose';

const authSessionSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    refreshTokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, required: true },
    revokedAt: { type: Date },
    revocationReason: { type: String },
    ip: { type: String, maxlength: 100 },
    userAgent: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

// Sessao vencida ja' e' inutil para autenticar (protect e rotateAuthSession
// exigem expiresAt > agora). Sem este TTL a colecao cresceria para sempre —
// o historico de quem entrou fica no audit log, nao aqui.
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type IAuthSession = InferSchemaType<typeof authSessionSchema> & { _id: Types.ObjectId };

export default model('AuthSession', authSessionSchema);
