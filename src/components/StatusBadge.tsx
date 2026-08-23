import clsx from 'clsx'
import type { BillStatus } from '../types/database'

const STYLES: Record<BillStatus, string> = {
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-orange-100 text-orange-800',
  unpaid: 'bg-orange-100 text-orange-800',
  overdue: 'bg-red-100 text-red-800',
}

const LABELS: Record<BillStatus, string> = {
  paid: 'Paid',
  partial: 'Partially Paid',
  unpaid: 'Pending',
  overdue: 'Overdue',
}

export function StatusBadge({ status }: { status: BillStatus }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold', STYLES[status])}>
      {LABELS[status]}
    </span>
  )
}
