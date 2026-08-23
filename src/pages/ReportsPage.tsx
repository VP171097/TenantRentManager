import { useQuery } from '@tanstack/react-query'
import { listBills } from '../services/billing'
import { listTenants } from '../services/tenants'
import { LoadingState, ErrorState } from '../components/States'
import { DashboardCard } from '../components/DashboardCard'
import { formatINR } from '../utils/money'
import { downloadCsv, toCsv } from '../utils/csv'

export function ReportsPage() {
  const { data: bills, isLoading, error, refetch } = useQuery({ queryKey: ['bills'], queryFn: () => listBills() })
  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: () => listTenants() })

  if (isLoading) return <LoadingState />
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Reports</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Total Collected" value={formatINR(totalCollected)} tone="good" />
        <DashboardCard label="Total Outstanding" value={formatINR(totalOutstanding)} tone="bad" />
        <DashboardCard label="Total Credit Held" value={formatINR(totalCredit)} tone="warn" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Monthly collection vs due</h2>
          <button onClick={exportOutstanding} className="btn-secondary px-4">
            Export Outstanding CSV
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Total Due</th>
                <th className="px-4 py-3">Total Paid</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map(([month, v]) => (
                <tr key={month} className="border-t border-slate-100">
                  <td className="px-4 py-3">{new Date(month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-3">{formatINR(v.due)}</td>
                  <td className="px-4 py-3">{formatINR(v.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
