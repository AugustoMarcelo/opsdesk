import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useSocket } from './useSocket';
import {
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  listUnreadNotifications,
} from '../api/notifications';
import type { Notification } from '../api/notifications';

export function useNotifications() {
  const { token } = useAuth();
  const { socket } = useSocket(token);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [countRes, listRes] = await Promise.all([
        getUnreadCount(token),
        listUnreadNotifications(token),
      ]);
      setUnreadCount(countRes.count);
      setNotifications(listRes.data ?? []);
    } catch {
      setUnreadCount(0);
      setNotifications([]);
    }
  }, [token]);

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
      await refresh();
    } catch {
      // ignore
    }
  }, [token, refresh]);

  const markOneAsRead = useCallback(
    async (notificationId: string) => {
      if (!token) return;
      try {
        await markNotificationRead(token, notificationId);
        await refresh();
      } catch {
        // ignore
      }
    },
    [token, refresh]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      setUnreadCount((prev) => prev + 1);
      void refresh();
    };
    socket.on('notification:new', handler);
    return () => {
      socket.off('notification:new', handler);
    };
  }, [socket, refresh]);

  return { unreadCount, notifications, refresh, markAllAsRead, markOneAsRead };
}
