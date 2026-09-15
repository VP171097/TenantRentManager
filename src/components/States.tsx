import type { ReactNode } from 'react'
import { AlertCircle, Info } from 'lucide-react'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-slate-500 dark:text-slate-400">
      <div className="relative flex h-12 w-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-100 dark:border-brand-950 border-t-brand-600 dark:border-t-brand-400" />
        <div className="absolute inset-2 rounded-full bg-brand-600/10" />
      </div>
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 py-14 text-center px-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
        <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
      </div>
      <div>
        <p className="text-base font-semibold text-red-700 dark:text-red-400">{message}</p>
        <p className="mt-1 text-sm text-red-500 dark:text-red-500">Please check your connection and try again.</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition active:scale-95"
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-16 text-center px-6">
      {icon && <div className="mb-1 h-16 w-16 text-slate-300 dark:text-slate-600">{icon}</div>}
      <p className="text-base font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {description && <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function InfoState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
      <Info size={16} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  )
}
