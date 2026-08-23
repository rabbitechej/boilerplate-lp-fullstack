export type PublicPostDto = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type PostDto = PublicPostDto & { published: boolean };

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminDto = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export type LoginResponse = {
  accessToken: string;
  admin: AdminDto;
};

export type AuditStatus = 'success' | 'failure';

export type AuditLogDto = {
  id: string;
  adminId?: string;
  adminEmail?: string;
  adminName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  status: AuditStatus;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type AuditLogFilters = {
  action?: string;
  resource?: string;
  status?: AuditStatus | '';
  from?: string;
  to?: string;
};

export type ContactMessageDto = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};
