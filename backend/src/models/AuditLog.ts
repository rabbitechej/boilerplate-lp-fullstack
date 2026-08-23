import { Schema, Types, model, type InferSchemaType } from 'mongoose';

export const AUDIT_STATUSES = ['success', 'failure'] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

const auditLogSchema = new Schema(
  {
    // Opcional: eventos de seguranca sem sessao valida (login com email
    // inexistente, refresh token reusado) tambem precisam ser registrados.
    adminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
    // Email/nome sao desnormalizados de proposito: o registro de auditoria tem
    // de continuar legivel mesmo depois que o administrador for removido.
    adminEmail: { type: String, trim: true, lowercase: true, maxlength: 200 },
    adminName: { type: String, trim: true, maxlength: 120 },
    action: { type: String, required: true, maxlength: 80 },
    resource: { type: String, required: true, maxlength: 80 },
    resourceId: { type: String, maxlength: 100 },
    status: { type: String, enum: AUDIT_STATUSES, default: 'success' },
    ip: { type: String, maxlength: 100 },
    userAgent: { type: String, maxlength: 500 },
    // Correlaciona a entrada de auditoria com as linhas de log da requisicao.
    requestId: { type: String, maxlength: 100 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

// A listagem sempre ordena por createdAt desc e filtra por esses campos.
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ resource: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ status: 1, createdAt: -1 });

export type IAuditLog = InferSchemaType<typeof auditLogSchema> & { _id: Types.ObjectId };

export default model('AuditLog', auditLogSchema);
