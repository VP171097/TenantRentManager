import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listBills } from '../services/billing'
import { listTenants } from '../services/tenants'
import { ErrorState } from '../components/States'
import { SkeletonStatGrid, SkeletonTable } from '../components/Skeleton'
import { DashboardCard } from '../components/DashboardCard'
import { formatINR } from '../utils/money'
import { downloadCsv, toCsv } from '../utils/csv'

type SortKey = 'month' | 'due' | 'paid'

function SortTh({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string
  k: SortKey
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
}) {
  const active = sortKey === k
  return (
    <th className="px-4 py-3">
      <button
        onClick={() => onSort(k)}
        className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
      >
        {label}
        <span className={`text-[10px] ${active ? 'opacity-100' : 'opacity-30'}`} aria-hidden>
          {active && sortDir === 'desc' ? '▼' : '▲'}
        </span>
      </button>
    </th>
  )
}

export function ReportsPage() {
  const { data: bills, isLoading, error, refetch } = useQuery({ queryKey: ['bills'], queryFn: () => listBills() })
  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: () => listTenants() })
  const [sortKey, setSortKey] = useState<SortKey>('month')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Reports</h1>
        <SkeletonStatGrid count={3} />
        <SkeletonTable cols={3} />
      </div>
    )
  }
  if (error) return <ErrorState message="Could not load reports." onRetry={() => refetch()} />

  const list = bills ?? []
  const totalCollected = list.reduce((s, b) => s + b.total_paid, 0)
  const totalOutstanding = list.reduce((s, b) => s + (b.balance > 0 ? b.balance : 0), 0)
  const totalCredit = list.reduce((s, b) => s + (b.balance < 0 ? Math.abs(b.balance) : 0), 0)

  const byMonth = new Map<string, { due: number; paid: number }>()
  for (const b of list) {
    const key = b.billing_month
    const entry = byMonth.get(key) ?? { due: 0, paid: 0 }
    entry.due += b.total_due
    entry.paid += b.total_paid
    byMonth.set(key, entry)
  }
  const monthly = Array.from(byMonth.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12)

  function exportOutstanding() {
    const rows = list
      .filter((b) => b.balance > 0)
      .map((b) => ({
        tenant: tenants?.find((t) => t.id === b.tenant_id)?.full_name ?? '',
        month: b.billing_month,
        balance: b.balance,
      }))
    downloadCsv(
      'outstanding.csv',
      toCsv(rows, [
        { key: 'tenant', label: 'Tenant' },
        { key: 'month', label: 'Month' },
        { key: 'balance', label: 'Balance' },
      ])
    )
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedMonthly = [...monthly].sort((a, b) => {
    const factor = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'month') return factor * (new Date(a[0]).getTime() - new Date(b[0]).getTime())
    if (sortKey === 'due') return factor * (a[1].due - b[1].due)
    return factor * (a[1].paid - b[1].paid)
  })

  return (
    <div className="space-y-6 page-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Reports</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Total Collected" value={formatINR(totalCollected)} tone="good" countTo={totalCollected} format={formatINR} />
        <DashboardCard label="Total Outstanding" value={formatINR(totalOutstanding)} tone="bad" countTo={totalOutstanding} format={formatINR} />
        <DashboardCard label="Total Credit Held" value={formatINR(totalCredit)} tone="warn" countTo={totalCredit} format={formatINR} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Monthly collection vs due</h2>
          <button onClick={exportOutstanding} className="btn-secondary px-4">
            Export Outstanding CSV
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm max-h-[70vh]">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 text-left text-slate-600 dark:text-slate-300">
              <tr>
                <SortTh label="Month" k="month" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Total Due" k="due" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Total Paid" k="paid" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedMonthly.map(([month, v], i) => (
                <tr
                  key={month}
                  className={`border-t border-slate-100 dark:border-slate-700 ${i % 2 === 1 ? 'bg-slate-50/60 dark:bg-slate-900/40' : ''}`}
                >
                  <td className="px-4 py-3 dark:text-slate-200">
                    {new Date(month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 dark:text-slate-200">{formatINR(v.due)}</td>
                  <td className="px-4 py-3 dark:text-slate-200">{formatINR(v.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
