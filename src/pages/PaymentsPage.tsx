import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listBills } from '../services/billing'
import { listTenants } from '../services/tenants'
import { recordPayment, listPayments, generateReceipt } from '../services/payments'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { PaymentForm } from '../components/forms/PaymentForm'
import { ErrorState, EmptyState } from '../components/States'
import { Skeleton, SkeletonList } from '../components/Skeleton'
import { PaymentEmptyIcon } from '../components/EmptyIcons'
import { friendlyError } from '../utils/errors'
import { formatINR } from '../utils/money'
import { downloadReceiptPdf } from '../services/receiptPdf'
import { useOwnerLogoUrl } from '../hooks/useOwnerBranding'
import { downloadCsv, toCsv } from '../utils/csv'
import { getReadingForMonth } from '../services/electricity'

type SortKey = 'date' | 'amount'

export function PaymentsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const { data: bills, isLoading, error: loadError, refetch } = useQuery({ queryKey: ['bills'], queryFn: () => listBills() })
  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: () => listTenants() })
  const { data: payments } = useQuery({ queryKey: ['payments'], queryFn: () => listPayments() })
  const logoUrl = useOwnerLogoUrl()

  const outstanding = useMemo(() => (bills ?? []).filter((b) => b.balance > 0), [bills])
  const tenantName = (tid: string) => tenants?.find((t) => t.id === tid)?.full_name ?? '—'

  const mutation = useMutation({
    mutationFn: (values: { bill_id: string; amount: number; payment_date: string; method: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other'; reference?: string }) => {
      const bill = bills?.find((b) => b.id === values.bill_id)
      if (!bill) throw new Error('Bill not found')
      return recordPayment({ ...values, tenant_id: bill.tenant_id, recorded_by: profile?.id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      setError(null)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  async function handleReceipt(paymentId: string) {
    try {
      const receipt = await generateReceipt(paymentId)
      const payment = payments?.find((p) => p.id === paymentId)
      const bill = bills?.find((b) => b.id === payment?.bill_id)
      if (payment && bill) {
        const [{ data: tenant }, { data: property }] = await Promise.all([
          supabase.from('tenants').select('*').eq('id', bill.tenant_id).single(),
          supabase.from('properties').select('*').eq('id', bill.property_id).single(),
        ])
        if (tenant && property) {
          const [reading, { data: ownerProfile }] = await Promise.all([
            getReadingForMonth(tenant.id, bill.billing_month).catch(() => null),
            supabase.from('profiles').select('full_name, phone').eq('id', tenant.owner_id).maybeSingle(),
          ])
          downloadReceiptPdf({
            receipt,
            payment,
            bill,
            tenant,
            property,
            logoUrl,
            reading,
            ownerName: (ownerProfile as { full_name?: string } | null)?.full_name,
            ownerPhone: (ownerProfile as { phone?: string } | null)?.phone,
          })
        }
      }
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="card max-w-md space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <SkeletonList />
      </div>
    )
  }
  if (loadError) return <ErrorState message="Could not load bills." onRetry={() => refetch()} />

  const sortedPayments = [...(payments ?? [])].sort((a, b) => {
    const factor = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'amount') return factor * (a.amount - b.amount)
    return factor * (new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
  })

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function handleExport() {
    const csv = toCsv(
      sortedPayments.map((p) => ({ ...p, tenant_name: tenantName(p.tenant_id) })),
      [
        { key: 'tenant_name', label: 'Tenant' },
        { key: 'amount', label: 'Amount' },
        { key: 'payment_date', label: 'Payment Date' },
        { key: 'method', label: 'Method' },
        { key: 'reference', label: 'Reference' },
      ]
    )
    downloadCsv('payments.csv', csv)
  }

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Payments</h1>
        <button onClick={handleExport} className="btn-secondary px-4" disabled={sortedPayments.length === 0}>
          Export CSV
        </button>
      </div>

      <div className="card max-w-md">
        <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Record a Payment</h2>
        {error && <p className="mb-3 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
        {outstanding.length === 0 ? (
          <EmptyState title="No outstanding bills" description="All bills are fully paid." icon={<PaymentEmptyIcon className="h-full w-full" />} />
        ) : (
          <PaymentForm bills={outstanding} onSubmit={(v) => mutation.mutateAsync(v)} />
        )}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recent payments</h2>
          <div className="flex gap-2 text-xs font-semibold">
            <button
              onClick={() => toggleSort('date')}
              className={`rounded-lg px-3 py-1.5 ${sortKey === 'date' ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              Date {sortKey === 'date' && (sortDir === 'desc' ? '▼' : '▲')}
            </button>
            <button
              onClick={() => toggleSort('amount')}
              className={`rounded-lg px-3 py-1.5 ${sortKey === 'amount' ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              Amount {sortKey === 'amount' && (sortDir === 'desc' ? '▼' : '▲')}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {sortedPayments.slice(0, 20).map((p) => (
            <div key={p.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{tenantName(p.tenant_id)}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {formatINR(p.amount)} · {new Date(p.payment_date).toLocaleDateString('en-IN')} · {p.method.toUpperCase()}
                </p>
              </div>
              <button onClick={() => handleReceipt(p.id)} className="btn-secondary px-4">
                Receipt
              </button>
            </div>
          ))}
          {(!payments || payments.length === 0) && <EmptyState title="No payments recorded yet" icon={<PaymentEmptyIcon className="h-full w-full" />} />}
        </div>
      </section>
    </div>
  )
}
