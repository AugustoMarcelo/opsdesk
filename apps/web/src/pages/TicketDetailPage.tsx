import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useSocket } from '../hooks/useSocket';
import {
  getTicket,
  updateTicket,
  updateTicketStatus,
} from '../api/tickets';
import type { Ticket } from '../api/tickets';
import { TicketStatusBadge } from '../components/TicketStatusBadge';
import { ChatPanel } from '../components/ChatPanel';
import { ApiError } from '../api/client';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { socket, joinTicket } = useSocket(token);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const canUpdate = user?.permissions.includes('ticket:update');
  const canClose = user?.permissions.includes('ticket:close');

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    getTicket(token, id)
      .then((res) => {
        setTicket(res.data);
        setEditTitle(res.data.title);
        setEditDescription(res.data.description);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load ticket');
      })
      .finally(() => setLoading(false));
  }, [token, id]);

  useEffect(() => {
    if (id) joinTicket(id);
  }, [joinTicket, id]);

  useEffect(() => {
    if (!socket || !id) return;
    const handler = (payload: { newStatus: string }) => {
      setTicket((prev) => (prev ? { ...prev, status: payload.newStatus } : null));
    };
    socket.on('ticket:statusChanged', handler);
    return () => {
      socket.off('ticket:statusChanged', handler);
    };
  }, [socket, id]);

  const handleStatusChange = async (status: 'open' | 'closed') => {
    if (!token || !id) return;
    try {
      await updateTicketStatus(token, id, status);
      setTicket((prev) => (prev ? { ...prev, status } : null));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status');
    }
  };

  const handleSaveEdit = async () => {
    if (!token || !id) return;
    try {
      await updateTicket(token, id, {
        title: editTitle,
        description: editDescription,
      });
      setTicket((prev) =>
        prev ? { ...prev, title: editTitle, description: editDescription } : null
      );
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-700">
        {error}
        <button
          type="button"
          onClick={() => navigate('/tickets')}
          className="ml-4 text-sm underline"
        >
          Back to tickets
        </button>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Ticket Details</h1>
        <button
          type="button"
          onClick={() => navigate('/tickets')}
          className="text-sm text-slate-600 hover:text-slate-800"
        >
          ← Back to tickets
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          {canClose && ticket.status === 'open' && (
            <button
              type="button"
              onClick={() => handleStatusChange('closed')}
              className="rounded bg-slate-200 px-2 py-1 text-sm hover:bg-slate-300"
            >
              Close ticket
            </button>
          )}
          {canClose && ticket.status === 'closed' && (
            <button
              type="button"
              onClick={() => handleStatusChange('open')}
              className="rounded bg-slate-200 px-2 py-1 text-sm hover:bg-slate-300"
            >
              Reopen
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Title</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveEdit}
                className="rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEditTitle(ticket.title);
                  setEditDescription(ticket.description);
                }}
                className="rounded border border-slate-300 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-medium text-slate-800">{ticket.title}</h2>
            <p className="mt-2 text-slate-600">{ticket.description}</p>
            <p className="mt-4 text-xs text-slate-500">
              Created {new Date(ticket.createdAt).toLocaleString()}
            </p>
            {canUpdate && ticket.status !== 'closed' && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-4 text-sm text-amber-600 hover:text-amber-700"
              >
                Edit
              </button>
            )}
          </>
        )}
      </div>

      <ChatPanel ticketId={ticket.id} />
    </div>
  );
}
