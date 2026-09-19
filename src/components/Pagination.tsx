import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({
  page,
  pageCount,
  totalItems,
  pageSize,
  onChange,
}: {
  page: number
  pageCount: number
  totalItems: number
  pageSize: number
  onChange: (page: number) => void
}) {
  if (pageCount <= 1) return null

  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Showing {start}–{end} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 min-w-[70px] text-center">
          Page {page} of {pageCount}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
