import { apiFetch } from './client';

export interface Notification {
  id: string;
  ticketId: string;
  type: string;
  createdAt: string;
}

export interface NotificationsListResponse {
  data: Notification[];
}

export interface UnreadCountResponse {
  count: number;
}

export async function listUnreadNotifications(
  token: string,
): Promise<NotificationsListResponse> {
  return apiFetch<NotificationsListResponse>('/v1/notifications', { token });
}

export async function getUnreadCount(
  token: string,
): Promise<UnreadCountResponse> {
  return apiFetch<UnreadCountResponse>('/v1/notifications/unread', { token });
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await apiFetch('/v1/notifications/mark-all-read', {
    method: 'POST',
    token,
  });
}

export async function markNotificationRead(
  token: string,
  notificationId: string,
): Promise<void> {
  await apiFetch(`/v1/notifications/${notificationId}/read`, {
    method: 'POST',
    token,
  });
}
