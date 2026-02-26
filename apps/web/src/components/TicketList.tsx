import { Link } from 'react-router-dom';
import { TicketStatusBadge } from './TicketStatusBadge';
import type { Ticket } from '../api/tickets';

interface TicketListProps {
  tickets: Ticket[];
}

export function TicketList({ tickets }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
        No tickets found
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
              Created
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  to={`/tickets/${ticket.id}`}
                  className="font-medium text-amber-700 hover:text-amber-800"
                >
                  {ticket.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <TicketStatusBadge status={ticket.status} />
              </td>
              <td className="px-4 py-3 text-sm text-slate-500">
                {new Date(ticket.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
