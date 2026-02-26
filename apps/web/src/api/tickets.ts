import { apiFetch } from './client';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  ownerId: string;
  createdAt: string;
}

export interface TicketsListResponse {
  data: Ticket[];
  meta: { limit: number; offset: number; count: number };
}

export interface TicketDetailResponse {
  data: Ticket;
}

export async function listTickets(
  token: string,
  params?: {
    offset?: number;
    limit?: number;
    order?: 'asc' | 'desc';
    status?: 'open' | 'closed';
  }
): Promise<TicketsListResponse> {
  const search = new URLSearchParams();
  if (params?.offset != null) search.set('offset', String(params.offset));
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.order) search.set('order', params.order);
  if (params?.status) search.set('status', params.status);
  const qs = search.toString();
  return apiFetch<TicketsListResponse>(`/v1/tickets${qs ? `?${qs}` : ''}`, { token });
}

export async function getTicket(token: string, id: string): Promise<TicketDetailResponse> {
  return apiFetch<TicketDetailResponse>(`/v1/tickets/${id}`, { token });
}

export async function createTicket(
  token: string,
  data: { title: string; description: string }
): Promise<Ticket> {
  return apiFetch<Ticket>('/v1/tickets', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

export async function updateTicket(
  token: string,
  id: string,
  data: { title?: string; description?: string }
): Promise<void> {
  await apiFetch(`/v1/tickets/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

export async function updateTicketStatus(
  token: string,
  id: string,
  status: 'open' | 'closed'
): Promise<void> {
  await apiFetch(`/v1/tickets/${id}/status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status }),
  });
}
