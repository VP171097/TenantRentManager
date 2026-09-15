import clsx from 'clsx'
import type { BillStatus } from '../types/database'

const STYLES: Record<BillStatus, string> = {
  paid:     'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  partial:  'bg-amber-100  text-amber-800  dark:bg-amber-900/40  dark:text-amber-300',
  unpaid:   'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  overdue:  'bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300',
}

const DOTS: Record<BillStatus, string> = {
  paid:    'bg-emerald-500',
  partial: 'bg-amber-500',
  unpaid:  'bg-orange-500',
  overdue: 'bg-red-500',
}

const LABELS: Record<BillStatus, string> = {
  paid:    'Paid',
  partial: 'Partial',
  unpaid:  'Pending',
  overdue: 'Overdue',
}

export function StatusBadge({ status }: { status: BillStatus }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', STYLES[status])}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', DOTS[status])} aria-hidden />
      {LABELS[status]}
    </span>
  )
}
