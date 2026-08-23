import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { LoadingState, ErrorState } from '../../components/States'
import { BillSummary } from '../../components/BillSummary'
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
  const [showPay, setShowPay] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-data', profile?.id],
    queryFn: () => loadMyData(profile!.id),
    enabled: !!profile,
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
    </div>
  )
}
