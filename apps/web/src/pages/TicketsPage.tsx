import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { listTickets } from '../api/tickets';
import type { Ticket } from '../api/tickets';
import { TicketList } from '../components/TicketList';
import { Pagination } from '../components/Pagination';

type StatusFilter = 'all' | 'open' | 'closed';

export function TicketsPage() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meta, setMeta] = useState({ limit: 20, offset: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const fetchTickets = useCallback(
    (offset = 0) => {
      if (!token) return;
      setLoading(true);
      listTickets(token, {
        offset,
        limit: 20,
        order,
        status: statusFilter === 'all' ? undefined : statusFilter,
      })
        .then((res) => {
          setTickets(res.data ?? []);
          setMeta(res.meta ?? { limit: 20, offset: 0, count: 0 });
        })
        .catch(() => {
          setTickets([]);
        })
        .finally(() => setLoading(false));
    },
    [token, statusFilter, order]
  );

  useEffect(() => {
    fetchTickets(0);
  }, [fetchTickets]);

  const handlePageChange = (newOffset: number) => {
    fetchTickets(newOffset);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Tickets</h1>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          {(['all', 'open', 'closed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                statusFilter === s
                  ? 'bg-amber-100 text-amber-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={order}
          onChange={(e) => setOrder(e.target.value as 'asc' | 'desc')}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading...</div>
      ) : (
        <>
          <TicketList tickets={tickets} />
          <div className="mt-4 rounded-lg border border-slate-200 bg-white">
            <Pagination
              offset={meta.offset}
              limit={meta.limit}
              count={meta.count}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
