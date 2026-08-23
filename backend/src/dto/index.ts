import type { IAdmin } from '../models/Admin';
import type { IPost } from '../models/Post';

export type AdminDto = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export function toAdminDto(admin: IAdmin): AdminDto {
  return {
    id: String(admin._id),
    name: admin.name,
    email: admin.email,
    role: admin.role,
    active: admin.active,
  };
}

export type PostDto = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function toPostDto(post: IPost): PostDto {
  return {
    id: String(post._id),
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? undefined,
    content: post.content,
    coverImageUrl: post.coverImageUrl ?? undefined,
    published: post.published,
    createdAt: (post as unknown as { createdAt: Date }).createdAt,
    updatedAt: (post as unknown as { updatedAt: Date }).updatedAt,
  };
}

export type PublicPostDto = Omit<PostDto, 'published'>;

export function toPublicPostDto(post: IPost): PublicPostDto {
  const { published: _published, ...rest } = toPostDto(post);
  return rest;
}

export type AuditLogDto = {
  id: string;
  adminId?: string;
  adminEmail?: string;
  adminName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  status: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

export function toAuditLogDto(log: {
  _id: unknown;
  adminId?: unknown;
  adminEmail?: string | null;
  adminName?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  status?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}): AuditLogDto {
  return {
    id: String(log._id),
    adminId: log.adminId ? String(log.adminId) : undefined,
    adminEmail: log.adminEmail ?? undefined,
    adminName: log.adminName ?? undefined,
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId ?? undefined,
    status: log.status ?? 'success',
    ip: log.ip ?? undefined,
    userAgent: log.userAgent ?? undefined,
    requestId: log.requestId ?? undefined,
    metadata: log.metadata ?? undefined,
    createdAt: log.createdAt,
  };
}

export type ContactMessageDto = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
};

export function toContactMessageDto(entry: {
  _id: unknown;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
}): ContactMessageDto {
  return {
    id: String(entry._id),
    name: entry.name,
    email: entry.email,
    message: entry.message,
    createdAt: entry.createdAt,
  };
}
