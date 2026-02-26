import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { listTickets } from '../api/tickets';
import type { Ticket } from '../api/tickets';

export function DashboardPage() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    listTickets(token, { limit: 100, order: 'desc' })
      .then((res) => setTickets(res.data ?? []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [token]);

  const total = tickets.length;
  const open = tickets.filter((t) => t.status === 'open').length;
  const closed = tickets.filter((t) => t.status === 'closed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">Total Tickets</div>
          <div className="mt-1 text-3xl font-bold text-slate-800">{total}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">Open</div>
          <div className="mt-1 text-3xl font-bold text-emerald-600">{open}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">Closed</div>
          <div className="mt-1 text-3xl font-bold text-slate-600">{closed}</div>
        </div>
      </div>
      <div className="mt-8 flex gap-4">
        <Link
          to="/tickets/new"
          className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700"
        >
          Create Ticket
        </Link>
        <Link
          to="/tickets"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
        >
          View All Tickets
        </Link>
      </div>
    </div>
  );
}
