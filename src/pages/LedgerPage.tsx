import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listBills } from '../services/billing'
import { listTenants } from '../services/tenants'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import { LedgerTable } from '../components/LedgerTable'
import { SearchBar } from '../components/SearchFilterBar'
import { downloadCsv, toCsv } from '../utils/csv'

export function LedgerPage() {
  const { data: bills, isLoading, error, refetch } = useQuery({ queryKey: ['bills'], queryFn: () => listBills() })
  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: () => listTenants() })
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!bills) return []
    if (!search) return bills
    const matchIds = new Set(
      (tenants ?? []).filter((t) => t.full_name.toLowerCase().includes(search.toLowerCase())).map((t) => t.id)
    )
    return bills.filter((b) => matchIds.has(b.tenant_id))
  }, [bills, tenants, search])

  function handleExport() {
    if (!filtered.length) return
    const rows = filtered.map((b) => ({
      tenant: tenants?.find((t) => t.id === b.tenant_id)?.full_name ?? '',
      month: new Date(b.billing_month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      rent: b.rent_amount,
      electricity: b.electricity_charge,
      total_due: b.total_due,
      total_paid: b.total_paid,
      balance: b.balance,
      status: b.status,
    }))
    const csv = toCsv(rows, [
      { key: 'tenant', label: 'Tenant' },
      { key: 'month', label: 'Month' },
      { key: 'rent', label: 'Rent' },
      { key: 'electricity', label: 'Electricity' },
      { key: 'total_due', label: 'Total Due' },
      { key: 'total_paid', label: 'Total Paid' },
      { key: 'balance', label: 'Balance' },
      { key: 'status', label: 'Status' },
    ])
    downloadCsv('ledger.csv', csv)
  }

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message="Could not load ledger." onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">Ledger</h1>
        <button onClick={handleExport} className="btn-secondary px-4">
          Export CSV
        </button>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by tenant name…" />
      {filtered.length === 0 ? <EmptyState title="No bills found" /> : <LedgerTable bills={filtered} />}
    </div>
  )
}
