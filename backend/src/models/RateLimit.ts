import { Schema, Types, model, type InferSchemaType } from 'mongoose';

const rateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type IRateLimit = InferSchemaType<typeof rateLimitSchema> & { _id: Types.ObjectId };

export default model('RateLimit', rateLimitSchema);
