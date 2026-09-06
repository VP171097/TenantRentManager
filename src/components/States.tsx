import type { ReactNode } from 'react'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500 dark:text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600 motion-reduce:animate-[spin_1.5s_linear_infinite]" />
      <p className="text-base">{label}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 py-12 text-center">
      <p className="text-base font-medium text-red-700 dark:text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-xl bg-red-600 px-5 py-2 text-white font-semibold shadow-sm hover:bg-red-700 transition active:scale-95"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-16 text-center px-6">
      {icon && <div className="mb-1 h-16 w-16 text-slate-300 dark:text-slate-600">{icon}</div>}
      <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {description && <p className="max-w-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
