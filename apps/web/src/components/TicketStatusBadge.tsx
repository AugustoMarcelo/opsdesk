interface TicketStatusBadgeProps {
  status: string;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  const styles =
    status === 'open'
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-slate-200 text-slate-700';

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}
    >
      {status}
    </span>
  );
}
