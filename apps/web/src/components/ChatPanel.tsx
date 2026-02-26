import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { listMessagesByTicket, sendMessage } from '../api/messages';
import type { Message } from '../api/messages';

interface ChatPanelProps {
  ticketId: string;
}

export function ChatPanel({ ticketId }: ChatPanelProps) {
  const { token, user } = useAuth();
  const { socket, connected, joinTicket } = useSocket(token);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    listMessagesByTicket(token, ticketId)
      .then((res) => setMessages(res.data ?? []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [token, ticketId]);

  useEffect(() => {
    joinTicket(ticketId);
  }, [joinTicket, ticketId]);

  useEffect(() => {
    if (!socket) return;
    const handler = (payload: { id: string; content: string; authorId: string; sentAt: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: payload.id,
          ticketId,
          authorId: payload.authorId,
          content: payload.content,
          createdAt: payload.sentAt,
        },
      ]);
    };
    socket.on('message:new', handler);
    return () => {
      socket.off('message:new', handler);
    };
  }, [socket, ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user || !input.trim()) return;
    setSending(true);
    try {
      await sendMessage(token, {
        ticketId,
        authorId: user.id,
        content: input.trim(),
      });
      setInput('');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <div className="text-slate-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-2">
        <span className="text-sm font-medium text-slate-700">Chat</span>
        {connected && (
          <span className="ml-2 text-xs text-emerald-600">• Connected</span>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No messages yet. Start the conversation.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg px-3 py-2 ${
                msg.authorId === user?.id
                  ? 'ml-8 bg-amber-100 text-amber-900'
                  : 'mr-8 bg-slate-100 text-slate-800'
              }`}
            >
              <div className="text-xs text-slate-500">
                {msg.authorId === user?.id ? 'You' : 'Agent'} •{' '}
                {new Date(msg.createdAt).toLocaleString()}
              </div>
              <div className="mt-0.5">{msg.content}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="border-t border-slate-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 rounded border border-slate-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
