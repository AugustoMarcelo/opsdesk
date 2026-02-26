interface PaginationProps {
  offset: number;
  limit: number;
  count: number;
  onPageChange: (newOffset: number) => void;
}

export function Pagination({
  offset,
  limit,
  count,
  onPageChange,
}: PaginationProps) {
  const page = Math.floor(offset / limit) + 1;
  const hasNext = count >= limit;
  const hasPrev = offset > 0;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2">
      <div className="text-sm text-slate-500">
        Page {page} • {count} items
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, offset - limit))}
          disabled={!hasPrev}
          className="rounded border border-slate-300 bg-white px-3 py-1 text-sm disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(offset + limit)}
          disabled={!hasNext}
          className="rounded border border-slate-300 bg-white px-3 py-1 text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
