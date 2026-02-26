import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getTicketHistory } from '../api/tickets';
import type { TicketHistoryEvent } from '../api/tickets';

interface TicketHistoryTimelineProps {
  ticketId: string;
}

function formatEventLabel(event: TicketHistoryEvent): string {
  switch (event.type) {
    case 'created':
      return 'Ticket created';
    case 'status_change': {
      const oldStatus = event.payload.oldStatus as string | undefined;
      const newStatus = event.payload.newStatus as string | undefined;
      if (oldStatus && newStatus) {
        return `Status changed from ${oldStatus} to ${newStatus}`;
      }
      return newStatus ? `Status set to ${newStatus}` : 'Status changed';
    }
    case 'message': {
      const content = event.payload.content as string | undefined;
      const preview =
        content && content.length > 60 ? `${content.slice(0, 60)}...` : content;
      return preview ? `Message: ${preview}` : 'Message sent';
    }
    default:
      return 'Activity';
  }
}

export function TicketHistoryTimeline({
  ticketId,
}: TicketHistoryTimelineProps) {
  const { token } = useAuth();
  const [events, setEvents] = useState<TicketHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!token) return;
    void getTicketHistory(token, ticketId)
      .then((res) => setEvents(res.data ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [token, ticketId]);

  const eventCount = events.length;

  const header = (
    <button
      type="button"
      onClick={() => setExpanded((e) => !e)}
      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left dark:border-slate-700 dark:bg-slate-800"
      aria-expanded={expanded}
    >
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
        History
        {!loading && (
          <span className="ml-2 text-slate-400 dark:text-slate-500">
            ({eventCount} {eventCount === 1 ? 'event' : 'events'})
          </span>
        )}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-4 w-4 shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${
          expanded ? 'rotate-180' : ''
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-0">
        {header}
        {expanded && (
          <div className="rounded-b-lg border-x border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Loading history...
            </div>
          </div>
        )}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="space-y-0">
        {header}
        {expanded && (
          <div className="rounded-b-lg border-x border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              No history yet.
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {header}
      {expanded && (
        <div className="space-y-4 rounded-b-lg border-x border-b border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex gap-3 border-l-2 border-slate-200 pl-4 dark:border-slate-600"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 dark:text-slate-200">
                  {formatEventLabel(event)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
