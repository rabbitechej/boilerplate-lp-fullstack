import { apiClient } from './client';
import type {
  AuditLogDto,
  AuditLogFilters,
  ContactMessageDto,
  LoginResponse,
  Paginated,
  PostDto,
} from './types';

function withPage(path: string, page = 1, limit = 20): string {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return `${path}?${params.toString()}`;
}

export const adminApi = {
  login(email: string, password: string) {
    return apiClient.post<LoginResponse>('/auth/login', { email, password });
  },
  refresh() {
    return apiClient.post<{ accessToken: string }>('/auth/refresh');
  },
  logout() {
    return apiClient.post<{ loggedOut: boolean }>('/auth/logout');
  },
  listPosts(accessToken: string, page = 1, limit = 20) {
    return apiClient.get<Paginated<PostDto>>(withPage('/admin/posts', page, limit), accessToken);
  },
  getPost(id: string, accessToken: string) {
    return apiClient.get<PostDto>(`/admin/posts/${id}`, accessToken);
  },
  createPost(payload: Partial<PostDto>, accessToken: string) {
    return apiClient.post<PostDto>('/admin/posts', payload, accessToken);
  },
  updatePost(id: string, payload: Partial<PostDto>, accessToken: string) {
    return apiClient.put<PostDto>(`/admin/posts/${id}`, payload, accessToken);
  },
  deletePost(id: string, accessToken: string) {
    return apiClient.delete<{ deleted: boolean }>(`/admin/posts/${id}`, accessToken);
  },
  listAuditLogs(accessToken: string, page = 1, limit = 20, filters: AuditLogFilters = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    // Filtro vazio nao vira query: o backend rejeita valores fora do formato.
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    return apiClient.get<Paginated<AuditLogDto>>(
      `/admin/audit-logs?${params.toString()}`,
      accessToken,
    );
  },
  listContactMessages(accessToken: string, page = 1, limit = 20) {
    return apiClient.get<Paginated<ContactMessageDto>>(
      withPage('/admin/contact-messages', page, limit),
      accessToken,
    );
  },
};
