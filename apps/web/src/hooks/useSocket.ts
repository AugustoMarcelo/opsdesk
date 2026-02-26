import { useCallback, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || window.location.origin;

export function useSocket(token: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const s = io(WS_URL, {
      path: '/ws',
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [token]);

  const joinTicket = useCallback(
    (ticketId: string) => {
      socket?.emit('ticket.join', ticketId);
    },
    [socket],
  );

  return { socket, connected, joinTicket };
}
