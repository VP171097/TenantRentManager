import { useMemo, useState } from 'react'
import type { Bill } from '../types/database'
import { formatINR } from '../utils/money'
import { StatusBadge } from './StatusBadge'

type SortKey = 'month' | 'rent' | 'electricity' | 'total_due' | 'total_paid' | 'balance' | 'status'
type SortDir = 'asc' | 'desc'

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
}: {
  label: string
  sortKey: SortKey
  active: boolean
  dir: SortDir
  onSort: (key: SortKey) => void
}) {
  return (
    <th className="px-4 py-3">
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
      >
        {label}
        <span className={`text-[10px] ${active ? 'opacity-100' : 'opacity-30'}`} aria-hidden>
          {active && dir === 'desc' ? '▼' : '▲'}
        </span>
      </button>
    </th>
  )
}

export function LedgerTable({
  bills,
  onEdit,
  onDelete,
}: {
  bills: Bill[]
  onEdit?: (bill: Bill) => void
  onDelete?: (bill: Bill) => void
}) {
  const showActions = !!onEdit || !!onDelete
  const [sortKey, setSortKey] = useState<SortKey>('month')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => {
    const factor = sortDir === 'asc' ? 1 : -1
    const rows = [...bills]
    rows.sort((a, b) => {
      switch (sortKey) {
        case 'month':
          return factor * (new Date(a.billing_month).getTime() - new Date(b.billing_month).getTime())
        case 'rent':
          return factor * (a.rent_amount - b.rent_amount)
        case 'electricity':
          return factor * (a.electricity_charge - b.electricity_charge)
        case 'total_due':
          return factor * (a.total_due - b.total_due)
        case 'total_paid':
          return factor * (a.total_paid - b.total_paid)
        case 'balance':
          return factor * (a.balance - b.balance)
        case 'status':
          return factor * a.status.localeCompare(b.status)
        default:
          return 0
      }
    })
    return rows
  }, [bills, sortKey, sortDir])

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm max-h-[70vh]">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 text-left text-slate-600 dark:text-slate-300 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
          <tr>
            <SortHeader label="Month" sortKey="month" active={sortKey === 'month'} dir={sortDir} onSort={handleSort} />
            <SortHeader label="Rent" sortKey="rent" active={sortKey === 'rent'} dir={sortDir} onSort={handleSort} />
            <SortHeader label="Electricity" sortKey="electricity" active={sortKey === 'electricity'} dir={sortDir} onSort={handleSort} />
            <SortHeader label="Total Due" sortKey="total_due" active={sortKey === 'total_due'} dir={sortDir} onSort={handleSort} />
            <SortHeader label="Paid" sortKey="total_paid" active={sortKey === 'total_paid'} dir={sortDir} onSort={handleSort} />
            <SortHeader label="Balance" sortKey="balance" active={sortKey === 'balance'} dir={sortDir} onSort={handleSort} />
            <SortHeader label="Status" sortKey="status" active={sortKey === 'status'} dir={sortDir} onSort={handleSort} />
            {showActions && <th className="px-4 py-3">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((b, i) => (
            <tr
              key={b.id}
              className={`border-t border-slate-100 dark:border-slate-700 ${
                i % 2 === 1 ? 'bg-slate-50/60 dark:bg-slate-900/40' : ''
              }`}
            >
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                {new Date(b.billing_month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </td>
              <td className="px-4 py-3 dark:text-slate-200">{formatINR(b.rent_amount)}</td>
              <td className="px-4 py-3 dark:text-slate-200">{formatINR(b.electricity_charge)}</td>
              <td className="px-4 py-3 dark:text-slate-200">{formatINR(b.total_due)}</td>
              <td className="px-4 py-3 dark:text-slate-200">{formatINR(b.total_paid)}</td>
              <td className={`px-4 py-3 font-semibold ${b.balance > 0 ? 'text-red-600 dark:text-red-400' : b.balance < 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-300'}`}>
                {formatINR(b.balance)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={b.status} />
              </td>
              {showActions && (
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {onEdit && (
                      <button onClick={() => onEdit(b)} className="font-semibold text-brand-700 dark:text-brand-300 hover:underline">
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(b)} className="font-semibold text-red-600 dark:text-red-400 hover:underline">
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
