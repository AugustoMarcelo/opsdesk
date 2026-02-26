import { apiFetch } from './client';

export interface Message {
  id: string;
  ticketId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface MessagesListResponse {
  data: Message[];
  meta: { count: number };
}

export async function listMessagesByTicket(
  token: string,
  ticketId: string
): Promise<MessagesListResponse> {
  return apiFetch<MessagesListResponse>(`/v1/tickets/${ticketId}/messages`, { token });
}

export async function sendMessage(
  token: string,
  data: { ticketId: string; authorId: string; content: string }
): Promise<Message> {
  return apiFetch<Message>('/v1/messages', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}
