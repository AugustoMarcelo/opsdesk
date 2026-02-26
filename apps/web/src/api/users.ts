import { apiFetch } from './client';

export interface Role {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  externalId?: string;
  createdAt: string;
}

export interface UsersListResponse {
  data?: User[];
  meta?: { limit: number; offset: number; count: number };
}

export async function listUsers(
  token: string,
  params?: { offset?: number; limit?: number; order?: 'asc' | 'desc' }
): Promise<UsersListResponse> {
  const search = new URLSearchParams();
  if (params?.offset != null) search.set('offset', String(params.offset));
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.order) search.set('order', params.order);
  const qs = search.toString();
  return apiFetch<UsersListResponse>(`/v1/users${qs ? `?${qs}` : ''}`, { token });
}

export async function listRoles(token: string): Promise<{ data: Role[] }> {
  return apiFetch<{ data: Role[] }>('/v1/users/roles', { token });
}

export async function createUser(
  token: string,
  data: { email: string; name: string; password: string; roleId?: string }
): Promise<User> {
  return apiFetch<User>('/v1/users', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}
