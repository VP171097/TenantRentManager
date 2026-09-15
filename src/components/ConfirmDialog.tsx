import type { ReactNode } from 'react'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  useLockBodyScroll(open)
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      {/* Backdrop — click to cancel */}
      <div className="absolute inset-0 backdrop-blur-sm" onClick={onCancel} aria-hidden />

      <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 slide-up">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Close"
        >
          <X size={14} />
        </button>

        <div className="p-6 pt-7">
          {/* Icon */}
          {danger && (
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
              <AlertTriangle size={22} className="text-red-600 dark:text-red-400" />
            </div>
          )}

          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>

          {children}

          <div className="mt-6 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.97] ${
                danger
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                  : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/20'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
