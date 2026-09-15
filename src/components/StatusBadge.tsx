import clsx from 'clsx'
import type { BillStatus } from '../types/database'

// Money-positive reads as teal (brand), matching the "Ledger" palette
// used everywhere else (dashboard tones, buttons).
const STYLES: Record<BillStatus, string> = {
  paid:     'bg-brand-100  text-brand-800  dark:bg-brand-900/40  dark:text-brand-300',
  partial:  'bg-gold-100   text-gold-800   dark:bg-gold-900/40   dark:text-gold-300',
  unpaid:   'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  overdue:  'bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300',
}

const DOTS: Record<BillStatus, string> = {
  paid:    'bg-brand-500',
  partial: 'bg-gold-500',
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
