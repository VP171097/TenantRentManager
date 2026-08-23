import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listBills } from '../services/billing'
import { listTenants } from '../services/tenants'
import { recordPayment, listPayments, generateReceipt } from '../services/payments'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { PaymentForm } from '../components/forms/PaymentForm'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import { friendlyError } from '../utils/errors'
import { formatINR } from '../utils/money'
import { downloadReceiptPdf } from '../services/receiptPdf'

export function PaymentsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { data: bills, isLoading, error: loadError, refetch } = useQuery({ queryKey: ['bills'], queryFn: () => listBills() })
  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: () => listTenants() })
  const { data: payments } = useQuery({ queryKey: ['payments'], queryFn: () => listPayments() })

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
        if (tenant && property) downloadReceiptPdf({ receipt, payment, bill, tenant, property })
      }
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  if (isLoading) return <LoadingState />
  if (loadError) return <ErrorState message="Could not load bills." onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Payments</h1>

      <div className="card max-w-md">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Record a Payment</h2>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {outstanding.length === 0 ? (
          <EmptyState title="No outstanding bills" description="All bills are fully paid." />
        ) : (
          <PaymentForm bills={outstanding} onSubmit={(v) => mutation.mutateAsync(v)} />
        )}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Recent payments</h2>
        <div className="space-y-2">
          {payments?.slice(0, 20).map((p) => (
            <div key={p.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold">{tenantName(p.tenant_id)}</p>
                <p className="text-sm text-slate-500">
                  {formatINR(p.amount)} · {new Date(p.payment_date).toLocaleDateString('en-IN')} · {p.method.toUpperCase()}
                </p>
              </div>
              <button onClick={() => handleReceipt(p.id)} className="btn-secondary px-4">
                Receipt
              </button>
            </div>
          ))}
          {(!payments || payments.length === 0) && <EmptyState title="No payments recorded yet" />}
        </div>
      </section>
    </div>
  )
}
