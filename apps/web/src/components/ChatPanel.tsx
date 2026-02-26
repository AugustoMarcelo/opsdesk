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
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="text-slate-500 dark:text-slate-400">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-200 px-4 py-2 dark:border-slate-700">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Chat</span>
        {connected && (
          <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">• Connected</span>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No messages yet. Start the conversation.
          </div>
        ) : (
          messages.map((msg) => {
            const authorId = msg.authorId ?? (msg as { author_id?: string }).author_id;
            const isOwn = authorId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isOwn
                      ? 'bg-emerald-600 text-white dark:bg-emerald-700'
                      : 'bg-slate-200 text-slate-900 dark:bg-slate-600 dark:text-slate-100'
                  }`}
                >
                  <div className={`text-xs font-medium ${isOwn ? 'text-emerald-200' : 'text-slate-500 dark:text-slate-400'}`}>
                    {isOwn ? 'You' : 'Other'} · {new Date(msg.createdAt).toLocaleString()}
                  </div>
                  <div className="mt-1 break-words">{msg.content}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="border-t border-slate-200 p-4 dark:border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 rounded border border-slate-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
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
