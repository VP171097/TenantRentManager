import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ErrorState, EmptyState } from '../../components/States'
import { SkeletonList } from '../../components/Skeleton'
import { ReceiptEmptyIcon } from '../../components/EmptyIcons'
import { downloadReceiptPdf } from '../../services/receiptPdf'
import { getReadingForMonth } from '../../services/electricity'
import type { Receipt, Tenant } from '../../types/database'

async function loadReceipts(profileId: string) {
  const { data: tenant, error: tErr } = await supabase.from('tenants').select('*').eq('profile_id', profileId).single()
  if (tErr) throw tErr
  const { data: receipts, error: rErr } = await supabase
    .from('receipts')
    .select('*')
    .eq('tenant_id', (tenant as Tenant).id)
    .order('generated_at', { ascending: false })
  if (rErr) throw rErr
  return { tenant: tenant as Tenant, receipts: (receipts ?? []) as Receipt[] }
}

export function TenantReceiptsPage() {
  const { profile } = useAuth()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-receipts', profile?.id],
    queryFn: () => loadReceipts(profile!.id),
    enabled: !!profile,
  })

  async function handleDownload(receiptId: string) {
    const receipt = data?.receipts.find((r) => r.id === receiptId)
    if (!receipt || !data) return
    const [{ data: payment }, { data: property }, { data: ownerProfile }] = await Promise.all([
      supabase.from('payments').select('*').eq('id', receipt.payment_id).single(),
      supabase.from('properties').select('*').eq('id', receipt.property_id).single(),
      supabase.from('profiles').select('logo_url, full_name, phone, email').eq('id', data.tenant.owner_id).maybeSingle(),
    ])
    // Fetched by payment.bill_id, not "the tenant's latest bill" — a receipt
    // must reflect the bill it was actually generated against, which isn't
    // necessarily the most recent one (e.g. a receipt for a since-superseded month).
    const { data: bill } = payment
      ? await supabase.from('bills').select('*').eq('id', payment.bill_id).maybeSingle()
      : { data: null }
    if (payment && bill && property) {
      const [reading, { data: room }] = await Promise.all([
        getReadingForMonth(data.tenant.id, bill.billing_month).catch(() => null),
        supabase.from('rooms').select('room_number').eq('id', bill.room_id).maybeSingle(),
      ])
      downloadReceiptPdf({
        receipt,
        payment,
        bill,
        tenant: data.tenant,
        property,
        logoUrl: (ownerProfile as { logo_url?: string } | null)?.logo_url,
        roomNumber: (room as { room_number?: string } | null)?.room_number,
        reading,
        ownerName: (ownerProfile as { full_name?: string } | null)?.full_name,
        ownerPhone: (ownerProfile as { phone?: string } | null)?.phone,
        ownerEmail: (ownerProfile as { email?: string } | null)?.email,
      })
    }
  }

  if (isLoading) return <SkeletonList />
  if (error) return <ErrorState message="Could not load your receipts." onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">My Receipts</h1>
      {data && data.receipts.length > 0 ? (
        <div className="space-y-2">
          {data.receipts.map((r) => (
            <div key={r.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold">{r.receipt_number}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{new Date(r.generated_at).toLocaleDateString('en-IN')}</p>
              </div>
              <button onClick={() => handleDownload(r.id)} className="btn-secondary px-4">
                Download
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No receipts yet" icon={<ReceiptEmptyIcon className="h-full w-full" />} />
      )}
    </div>
  )
}
