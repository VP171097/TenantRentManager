import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ErrorState } from '../../components/States'
import { SkeletonStatGrid } from '../../components/Skeleton'
import { BillSummary } from '../../components/BillSummary'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ImageUploader } from '../../components/ImageUploader'
import { markBillAsPaidByTenant } from '../../services/billing'
import { createMaintenanceRequest } from '../../services/maintenance'
import { friendlyError } from '../../utils/errors'
import { formatINR } from '../../utils/money'
import { buildUpiLink } from '../../utils/upi'
import type { Bill, Property, Tenant } from '../../types/database'
import QRCode from 'qrcode'
import { useEffect } from 'react'
import {
  Home, DoorOpen, CheckCircle, Wrench, Copy,
  QrCode, ChevronDown, ChevronUp, AlertCircle, Send,
  FileText, Phone, Calendar, Zap
} from 'lucide-react'

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
    .select('upi_id, full_name, phone, email')
    .eq('id', (tenant as Tenant).owner_id)
    .maybeSingle()
  let finalUpiId = ownerProfile?.upi_id ?? null
  let roomRecord: any = null
  if ((tenant as Tenant).room_id) {
    const { data: room } = await supabase.from('rooms').select('*').eq('id', (tenant as Tenant).room_id).maybeSingle()
    roomRecord = room
    if (room?.upi_id_id) {
      const { data: upiRecord } = await supabase.from('upi_ids').select('upi_id').eq('id', room.upi_id_id).maybeSingle()
      if (upiRecord?.upi_id) finalUpiId = upiRecord.upi_id
    }
  }
  const { data: documents } = await supabase.from('tenant_documents').select('*').eq('tenant_id', (tenant as Tenant).id).order('uploaded_at', { ascending: false })
  
  // electricity_readings (migration 032) is now the single source of
  // truth for monthly electricity data — always written, including for a
  // "Skip / Carry Forward" month (is_billed: false), with units_consumed
  // and amount pre-computed. This is now the primary source for the
  // Electricity History table below, not the bills table.
  const { data: recentReadings } = await supabase
    .from('electricity_readings')
    .select('*')
    .eq('tenant_id', (tenant as Tenant).id)
    .order('billing_month', { ascending: false })
    .limit(6)

  // "Billed Till (Units)" should always reflect the latest CHARGED
  // month's meter reading — i.e. skip over any deferred/is_billed=false
  // row (its reading is still real, but hasn't been billed to date).
  const latestBilledReading = (recentReadings ?? []).find((r) => r.is_billed)
  let latestReading: number
  if (latestBilledReading) {
    latestReading = latestBilledReading.current_reading
  } else {
    // Fallback for tenants whose entire history predates migration 032
    // (no electricity_readings row was ever written for a skipped bill):
    // derive it from the bill snapshot, or by summing electricity_units
    // forward from the tenant's start reading — this can never come back
    // null.
    const startReading = (tenant as Tenant).electricity_start_reading ?? 0
    const billsAscending = [...(bills ?? [])].sort(
      (a, b) => new Date(a.billing_month).getTime() - new Date(b.billing_month).getTime()
    )
    const latestBillWithReading = (bills ?? []).find((b: any) => b.current_electricity_reading != null)
    latestReading = latestBillWithReading
      ? (latestBillWithReading as any).current_electricity_reading
      : billsAscending.reduce((total, b: any) => total + (b.electricity_units || 0), startReading)
  }

  return {
    tenant: tenant as Tenant,
    bills: (bills ?? []) as Bill[],
    property: property as Property | null,
    upiId: finalUpiId,
    room: roomRecord,
    ownerProfile: ownerProfile as { full_name: string; phone: string | null; email: string | null } | null,
    documents: documents ?? [],
    latestReading,
    recentReadings: recentReadings ?? [],
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
  const [showReportProblem, setShowReportProblem] = useState(false)
  const [problemTitle, setProblemTitle] = useState('')
  const [problemDescription, setProblemDescription] = useState('')
  const [problemError, setProblemError] = useState<string | null>(null)
  const [problemDone, setProblemDone] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

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

  const reportProblemMutation = useMutation({
    mutationFn: () =>
      createMaintenanceRequest({
        tenant_id: data!.tenant.id,
        property_id: data!.tenant.property_id,
        room_id: data!.tenant.room_id,
        title: problemTitle.trim(),
        description: problemDescription.trim() || undefined,
        images: images.length > 0 ? images : undefined,
      }),
    onSuccess: () => {
      setShowReportProblem(false)
      setProblemTitle('')
      setProblemDescription('')
      setImages([])
      setProblemError(null)
      setProblemDone(true)
    },
    onError: (err) => setProblemError(friendlyError(err)),
  })

  const totalOutstanding = data ? data.bills.reduce((s, b) => s + (b.balance > 0 ? b.balance : 0), 0) : 0

  useEffect(() => {
    if (!showPay || !data?.upiId) { setQrDataUrl(null); return }
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

  async function copyUpiId() {
    if (!data?.upiId) return
    await navigator.clipboard.writeText(data.upiId).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) return <SkeletonStatGrid count={4} />
  if (error || !data) return <ErrorState message="Could not load your account." onRetry={() => refetch()} />

  const latestBill = data.bills[0]

  return (
    <div className="space-y-5 page-fade-in">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-gold-600 p-5 text-white shadow-lg shadow-brand-600/20">
        <h1 className="text-xl font-bold">Hi, {data.tenant.full_name.split(' ')[0]} 👋</h1>
        {data.property && (
          <div className="mt-2 flex items-center gap-3 text-white/80 text-sm">
            <div className="flex items-center gap-1.5">
              <Home size={14} />
              <span>{data.property.name}</span>
            </div>
            {data.room && (
              <div className="flex items-center gap-1.5">
                <DoorOpen size={14} />
                <span>Room {data.room.room_number}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment due card */}
      <div className={`card border-l-4 ${totalOutstanding > 0 ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {totalOutstanding > 0 ? 'Amount Due' : 'Balance'}
            </p>
            <p className={`mt-1 text-3xl font-extrabold tracking-tight ${totalOutstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatINR(totalOutstanding)}
            </p>
          </div>
          {totalOutstanding > 0 ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertCircle size={22} className="text-red-500" />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle size={22} className="text-emerald-500" />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => setShowPay((s) => !s)}
            className="btn-primary w-full gap-2"
          >
            <QrCode size={16} />
            {showPay ? 'Hide' : 'Make Payment'}
            {showPay ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {totalOutstanding > 0 && latestBill && !latestBill.tenant_marked_paid && (
            <button
              onClick={() => { setMarkPaidDone(false); setShowMarkPaid(true) }}
              className="btn-secondary w-full gap-2 text-sm"
            >
              <CheckCircle size={15} />
              I've Already Paid
            </button>
          )}
        </div>

        {/* Status messages */}
        {latestBill?.tenant_marked_paid && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle size={15} />
            Awaiting landlord confirmation.
          </div>
        )}
        {markPaidDone && !latestBill?.tenant_marked_paid && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle size={15} />
            Thanks — your landlord has been notified.
          </div>
        )}

        {/* UPI payment panel */}
        {showPay && (
          <div className="mt-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5 text-center fade-in">
            <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Scan to pay <span className="text-brand-600 dark:text-brand-400 font-bold">{formatINR(totalOutstanding)}</span>
            </p>
            {data.upiId ? (
              <div className="space-y-3">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="UPI payment QR code" className="mx-auto h-52 w-52 rounded-xl" />
                ) : (
                  <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                  </div>
                )}
                <div className="flex items-center justify-center gap-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{data.upiId}</p>
                  <button
                    onClick={copyUpiId}
                    className="flex items-center gap-1 rounded-lg bg-slate-200 dark:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    {copied ? <CheckCircle size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Scan with any UPI app · After payment, tap "I've Already Paid"
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your landlord hasn't set up UPI yet — contact them directly.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Latest bill summary */}
      {latestBill ? (
        <BillSummary bill={latestBill} />
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">No bills yet.</p>
      )}

      {/* Bill history — last 3 */}
      {data.bills.length > 1 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recent Bills</h2>
          <div className="space-y-2">
            {data.bills.slice(1, 4).map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {new Date(b.billing_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatINR(b.total_due)} due</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  b.balance <= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                }`}>
                  {b.balance <= 0 ? 'Paid' : `₹${b.balance.toLocaleString('en-IN')} due`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Electricity History — sourced directly from electricity_readings
          (migration 032), the single source of truth for monthly
          electricity data, always written including deferred months. */}
      {data.recentReadings.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Zap size={15} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Electricity History</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                  <th className="pb-2 font-medium">Month</th>
                  <th className="pb-2 font-medium">From Unit</th>
                  <th className="pb-2 font-medium">To Unit</th>
                  <th className="pb-2 font-medium text-right">Consumed</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recentReadings.map((r: any) => (
                  <tr key={r.id}>
                    <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">
                      {new Date(r.billing_month).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                    </td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">{r.previous_reading}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">{r.current_reading}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-700 dark:text-slate-200">{r.units_consumed}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-700 dark:text-slate-200">
                      {r.is_billed ? formatINR(r.amount) : <span className="text-amber-600 dark:text-amber-400">Deferred</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report a problem */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Wrench size={15} className="text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Report a Problem</h2>
        </div>

        {problemDone && !showReportProblem && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle size={15} />
            Your request has been sent to your landlord.
          </div>
        )}

        {!showReportProblem ? (
          <button
            onClick={() => { setProblemDone(false); setShowReportProblem(true) }}
            className="btn-secondary w-full gap-2 text-sm"
          >
            <Wrench size={14} />
            Report a Problem
          </button>
        ) : (
          <div className="space-y-3 slide-up">
            {problemError && (
              <p className="rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">{problemError}</p>
            )}
            <input
              type="text"
              placeholder="What's the problem? (e.g. Leaking tap)"
              value={problemTitle}
              onChange={(e) => setProblemTitle(e.target.value)}
              className="input"
            />
            <textarea
              placeholder="More details (optional)"
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              className="input resize-none"
              rows={3}
            />
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Upload Photo (optional)</p>
              <ImageUploader
                path={`${data.tenant.owner_id}/${data.tenant.property_id}/${data.tenant.id}/maint-${Date.now()}`}
                bucket="maintenance-media"
                label="Add a photo"
                currentUrl={images[0] || null}
                onUploaded={(url) => setImages([url])}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowReportProblem(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button
                onClick={() => reportProblemMutation.mutate()}
                disabled={!problemTitle.trim() || reportProblemMutation.isPending}
                className="btn-primary flex-1 gap-2 text-sm"
              >
                <Send size={14} />
                {reportProblemMutation.isPending ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Explore Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Explore</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Lease Info */}
          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/30">
                <Calendar size={15} className="text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Lease Info</h3>
            </div>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Move-in Date</span>
                <span className="font-semibold">{new Date(data.tenant.move_in_date).toLocaleDateString('en-IN')}</span>
              </div>
              {data.tenant.security_deposit > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Security Deposit</span>
                  <span className="font-semibold">{formatINR(data.tenant.security_deposit)}</span>
                </div>
              )}
              {data.room && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Base Rent</span>
                    <span className="font-semibold">{formatINR(data.room.base_rent)}/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Electricity Rate</span>
                    <span className="font-semibold">₹{data.room.electricity_rate}/unit</span>
                  </div>
                </>
              )}
              {data.latestReading != null && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Billed Till (Units)</span>
                  <span className="font-semibold">{data.latestReading} units</span>
                </div>
              )}
            </div>
          </div>

          {/* Landlord Contact */}
          {data.ownerProfile && (
            <div className="card space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                  <Phone size={15} className="text-sky-600 dark:text-sky-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Landlord Contact</h3>
              </div>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p className="font-semibold">{data.ownerProfile.full_name}</p>
                {data.ownerProfile.phone && <p className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {data.ownerProfile.phone}</p>}
                {data.ownerProfile.email && <p className="text-brand-600 dark:text-brand-400">{data.ownerProfile.email}</p>}
              </div>
            </div>
          )}
        </div>

        {/* My Documents */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/30">
              <FileText size={15} className="text-brand-600 dark:text-brand-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">My Documents</h3>
          </div>
          {data.documents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {data.documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={20} className="text-slate-400 shrink-0" />
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-300">{doc.file_name}</p>
                      <p className="text-xs text-slate-500">{new Date(doc.uploaded_at).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  <a
                    href={doc.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-brand-600 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No documents have been shared with you yet.
            </div>
          )}
        </div>
      </div>

      {/* Mark paid confirmation */}
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
            className="input text-sm"
          />
          {markPaidError && (
            <p className="text-sm text-red-600 dark:text-red-400">{markPaidError}</p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  )
}
