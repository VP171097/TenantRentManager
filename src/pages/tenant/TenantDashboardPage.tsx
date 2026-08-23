import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { LoadingState, ErrorState } from '../../components/States'
import { BillSummary } from '../../components/BillSummary'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { markBillAsPaidByTenant } from '../../services/billing'
import { friendlyError } from '../../utils/errors'
import { formatINR } from '../../utils/money'
import { buildUpiLink } from '../../utils/upi'
import type { Bill, Property, Tenant } from '../../types/database'
import QRCode from 'qrcode'
import { useEffect } from 'react'

async function loadMyData(profileId: string) {
  const { data: tenant, error: tErr } = await supabase.from('tenants').select('*').eq('profile_id', profileId).single()
  if (tErr) throw tErr
  const { data: bills, error: bErr } = await supabase
    .from('bills')
    .select('*')
    .eq('tenant_id', (tenant as Tenant).id)
    .order('billing_month', { ascending: false })
  if (bErr) throw bErr
  const { data: property } = await supabase.from('properties').select('*').eq('id', (tenant as Tenant).property_id).single()
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('upi_id')
    .eq('id', (tenant as Tenant).owner_id)
    .maybeSingle()
  return {
    tenant: tenant as Tenant,
    bills: (bills ?? []) as Bill[],
    property: property as Property | null,
    upiId: (ownerProfile as { upi_id?: string | null } | null)?.upi_id ?? null,
  }
}

export function TenantDashboardPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [showPay, setShowPay] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [showMarkPaid, setShowMarkPaid] = useState(false)
  const [paidNote, setPaidNote] = useState('')
  const [markPaidError, setMarkPaidError] = useState<string | null>(null)
  const [markPaidDone, setMarkPaidDone] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-data', profile?.id],
    queryFn: () => loadMyData(profile!.id),
    enabled: !!profile,
  })

  const markPaidMutation = useMutation({
    mutationFn: (billId: string) => markBillAsPaidByTenant(billId, paidNote.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-data', profile?.id] })
      setShowMarkPaid(false)
      setPaidNote('')
      setMarkPaidError(null)
      setMarkPaidDone(true)
    },
    onError: (err) => setMarkPaidError(friendlyError(err)),
  })

  const totalOutstanding = data ? data.bills.reduce((s, b) => s + (b.balance > 0 ? b.balance : 0), 0) : 0

  useEffect(() => {
    if (!showPay || !data?.upiId) {
      setQrDataUrl(null)
      return
    }
    const link = buildUpiLink({
      upiId: data.upiId,
      payeeName: data.property?.name ?? 'Rent',
      amount: totalOutstanding,
      note: 'Rent payment',
    })
    QRCode.toDataURL(link, { margin: 1, width: 220 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [showPay, data?.upiId, data?.property?.name, totalOutstanding])

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState message="Could not load your account." onRetry={() => refetch()} />

  const latestBill = data.bills[0]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Hi, {data.tenant.full_name}</h1>
      <div className="card space-y-3">
        <div>
          <p className="text-sm text-slate-500">Payment Due</p>
          <p className={`text-2xl font-bold ${totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatINR(totalOutstanding)}
          </p>
        </div>
        <button onClick={() => setShowPay((s) => !s)} className="btn-primary w-full">
          {showPay ? 'Hide' : 'Make Payment'}
        </button>
        {totalOutstanding > 0 && latestBill && !latestBill.tenant_marked_paid && (
          <button
            onClick={() => {
              setMarkPaidDone(false)
              setShowMarkPaid(true)
            }}
            className="btn-secondary w-full"
          >
            I've Paid
          </button>
        )}
        {latestBill?.tenant_marked_paid && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            You told your landlord you've paid this — they'll confirm it shortly.
          </p>
        )}
        {markPaidDone && !latestBill?.tenant_marked_paid && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Thanks — your landlord has been notified.</p>
        )}
        {showPay && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
            <p className="mb-2 font-semibold text-slate-700">Amount due: {formatINR(totalOutstanding)}</p>
            {data.upiId ? (
              <>
                {qrDataUrl && <img src={qrDataUrl} alt="UPI payment QR code" className="mx-auto h-52 w-52" />}
                <p className="mt-2 text-sm text-slate-600">UPI ID: {data.upiId}</p>
                <p className="mt-1 text-xs text-slate-500">Scan to pay via any UPI app, then inform your landlord.</p>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Your landlord hasn't set up UPI payment yet — please contact them directly.
              </p>
            )}
          </div>
        )}
      </div>
      {latestBill ? <BillSummary bill={latestBill} /> : <p className="text-slate-500">No bills yet.</p>}

      <ConfirmDialog
        open={showMarkPaid}
        title="Tell your landlord you've paid"
        message="This lets your landlord know you believe this bill is paid. They will confirm it once they see the payment."
        confirmLabel={markPaidMutation.isPending ? 'Sending…' : "Yes, I've Paid"}
        onCancel={() => setShowMarkPaid(false)}
        onConfirm={() => latestBill && markPaidMutation.mutate(latestBill.id)}
      >
        <div className="mt-3 space-y-2 text-left">
          <input
            type="text"
            placeholder="Reference / UTR number (optional)"
            value={paidNote}
            onChange={(e) => setPaidNote(e.target.value)}
            className="input"
          />
          {markPaidError && <p className="text-sm text-red-600">{markPaidError}</p>}
        </div>
      </ConfirmDialog>
    </div>
  )
}
