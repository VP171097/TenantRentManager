import clsx from 'clsx'

/** Base animated placeholder block. Respects prefers-reduced-motion via the
 * `motion-reduce:animate-none` variant (Tailwind maps this to the media
 * query directly, no JS needed). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 motion-reduce:animate-none', className)} />
}

/** Matches the shape of PropertyCard/RoomCard/TenantCard. */
export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm border border-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-4 w-20" />
      <Skeleton className="mt-2 h-4 w-28" />
    </div>
  )
}

/** A grid of SkeletonCards, matching the `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` list layout. */
export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

/** Matches DashboardCard's stat-tile shape. */
export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm border border-slate-100 dark:border-slate-700">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-7 w-20" />
    </div>
  )
}

export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  )
}

/** One placeholder table row with `cols` cells — used inside SkeletonTable. */
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-t border-slate-100 dark:border-slate-700">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-24" />
        </td>
      ))}
    </tr>
  )
}

/** A full table skeleton (header + rows) matching LedgerTable / report tables. */
export function SkeletonTable({ cols = 5, rows = 6 }: { cols?: number; rows?: number }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A simple vertical list of skeleton rows — for compact lists (managers, payments, documents). */
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}
