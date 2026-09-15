import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listBills, dismissTenantPaidFlag } from '../services/billing'
import { listTenants } from '../services/tenants'
import { recordPayment, listPayments, generateReceipt, approvePayment, deletePayment } from '../services/payments'
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
import { CreditCard, Download, FileDown, ArrowUpDown } from 'lucide-react'

type SortKey = 'date' | 'amount'

const METHOD_STYLE: Record<string, string> = {
  upi:           'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  bank_transfer: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  cash:          'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  cheque:        'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  other:         'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

const METHOD_LABEL: Record<string, string> = {
  upi: 'UPI', bank_transfer: 'Bank', cash: 'Cash', cheque: 'Cheque', other: 'Other',
}

export function PaymentsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all')
  const [prefillBillId, setPrefillBillId] = useState<string | undefined>(undefined)
  const recordPaymentRef = useRef<HTMLDivElement>(null)

  const { data: bills, isLoading, error: loadError, refetch } = useQuery({ queryKey: ['bills'], queryFn: () => listBills() })
  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: () => listTenants() })
  const { data: payments } = useQuery({ queryKey: ['payments'], queryFn: () => listPayments() })
  const logoUrl = useOwnerLogoUrl()

  const outstanding = useMemo(() => (bills ?? []).filter((b) => b.balance > 0), [bills])
  const tenantName = (tid: string) => tenants?.find((t) => t.id === tid)?.full_name ?? '—'
  // Tenant "I've Paid" self-reports — a separate mechanism from
  // manager-submitted payments awaiting owner approval (payments.
  // is_approved), so it needs its own list here. Previously these were
  // only visible buried on each tenant's own page.
  const tenantMarkedPaidBills = useMemo(() => (bills ?? []).filter((b) => b.tenant_marked_paid), [bills])

  function collectPayment(billId: string) {
    setPrefillBillId(billId)
    recordPaymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const mutation = useMutation({
    mutationFn: (values: { bill_id: string; amount: number; payment_date: string; method: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other'; reference?: string }) => {
      const bill = bills?.find((b) => b.id === values.bill_id)
      if (!bill) throw new Error('Bill not found')
      return recordPayment({ ...values, tenant_id: bill.tenant_id, recorded_by: profile?.id, is_approved: profile?.role === 'owner' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      setError(null)
      setPrefillBillId(undefined)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const dismissFlagMutation = useMutation({
    mutationFn: (billId: string) => dismissTenantPaidFlag(billId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bills'] }),
    onError: (err) => setError(friendlyError(err)),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approvePayment(id, profile!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
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
        <Skeleton className="h-8 w-48" />
        <div className="card max-w-lg space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <SkeletonList />
      </div>
    )
  }
  if (loadError) return <ErrorState message="Could not load bills." onRetry={() => refetch()} />

  const pendingPayments = (payments ?? []).filter((p) => !p.is_approved)
  const displayPayments = activeTab === 'pending' ? pendingPayments : (payments ?? [])

  const sortedPayments = [...displayPayments].sort((a, b) => {
    const factor = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'amount') return factor * (a.amount - b.amount)
    return factor * (new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
  })

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
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
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <CreditCard size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Payments</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{sortedPayments.length} total payments</p>
          </div>
        </div>
        <button onClick={handleExport} className="btn-secondary px-3 gap-1.5 text-sm" disabled={sortedPayments.length === 0}>
          <Download size={15} /> Export
        </button>
      </div>

      {/* Record Payment */}
      <div ref={recordPaymentRef} className="card max-w-lg scroll-mt-4">
        <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">Record a Payment</h2>
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        {outstanding.length === 0 ? (
          <EmptyState
            title="No outstanding bills"
            description="All bills are fully paid."
            icon={<PaymentEmptyIcon className="h-full w-full" />}
          />
        ) : (
          // Keyed on prefillBillId so clicking "Collect Payment" on a
          // tenant's self-reported bill (below) re-initializes the form
          // with that bill pre-selected — react-hook-form's defaultValues
          // only apply on mount, not on prop changes.
          <PaymentForm key={prefillBillId ?? 'none'} bills={outstanding} defaultBillId={prefillBillId} onSubmit={(v) => mutation.mutateAsync(v)} />
        )}
      </div>

      {/* Recent Payments */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-colors ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              All Payments
            </button>
            {profile?.role === 'owner' && (
              <button
                onClick={() => setActiveTab('pending')}
                className={`relative rounded-lg px-4 py-1.5 text-sm font-bold transition-colors ${
                  activeTab === 'pending'
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                Pending Approvals
                {pendingPayments.length + tenantMarkedPaidBills.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                    {pendingPayments.length + tenantMarkedPaidBills.length}
                  </span>
                )}
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            {(['date', 'amount'] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => toggleSort(key)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  sortKey === key
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ArrowUpDown size={11} />
                {key.charAt(0).toUpperCase() + key.slice(1)}
                {sortKey === key && <span>{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {activeTab === 'pending' &&
            tenantMarkedPaidBills.map((b) => (
              <div key={b.id} className="card border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  {tenantName(b.tenant_id)} says this is paid ({formatINR(b.balance)} still shows as due) — please confirm.
                </p>
                {b.tenant_marked_paid_note && (
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">Reference/note: {b.tenant_marked_paid_note}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => collectPayment(b.id)} className="btn-primary px-4">
                    Collect Payment
                  </button>
                  <button
                    onClick={() => dismissFlagMutation.mutate(b.id)}
                    disabled={dismissFlagMutation.isPending}
                    className="btn-secondary px-4"
                  >
                    Not Received / Dismiss
                  </button>
                </div>
              </div>
            ))}
          {sortedPayments.slice(0, 25).map((p) => (
            <div key={p.id} className="card flex items-center justify-between gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CreditCard size={15} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{tenantName(p.tenant_id)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatINR(p.amount)}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(p.payment_date).toLocaleDateString('en-IN')}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${METHOD_STYLE[p.method] ?? METHOD_STYLE.other}`}>
                      {METHOD_LABEL[p.method] ?? p.method}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!p.is_approved && profile?.role === 'owner' && (
                  <>
                    <button
                      onClick={() => approveMutation.mutate(p.id)}
                      disabled={approveMutation.isPending}
                      className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to revert this payment?')) {
                          deleteMutation.mutate(p.id)
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
                    >
                      Revert
                    </button>
                  </>
                )}
                {!p.is_approved && profile?.role === 'manager' && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    Pending
                  </span>
                )}
                {p.is_approved && (
                  <button onClick={() => handleReceipt(p.id)} className="btn-primary shrink-0 px-3 py-2 text-xs gap-1">
                    <FileDown size={13} /> Receipt
                  </button>
                )}
              </div>
            </div>
          ))}
          {(!payments || payments.length === 0) && (
            <EmptyState title="No payments recorded yet" icon={<PaymentEmptyIcon className="h-full w-full" />} />
          )}
        </div>
      </section>
    </div>
  )
}
