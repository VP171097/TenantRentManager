import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'
import { downloadReceiptPdf } from '../../services/receiptPdf'
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
    const [{ data: payment }, { data: bill }, { data: property }] = await Promise.all([
      supabase.from('payments').select('*').eq('id', receipt.payment_id).single(),
      supabase.from('bills').select('*').eq('tenant_id', receipt.tenant_id).order('billing_month', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('properties').select('*').eq('id', receipt.property_id).single(),
    ])
    if (payment && bill && property) downloadReceiptPdf({ receipt, payment, bill, tenant: data.tenant, property })
  }

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message="Could not load your receipts." onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">My Receipts</h1>
      {data && data.receipts.length > 0 ? (
        <div className="space-y-2">
          {data.receipts.map((r) => (
            <div key={r.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold">{r.receipt_number}</p>
                <p className="text-sm text-slate-500">{new Date(r.generated_at).toLocaleDateString('en-IN')}</p>
              </div>
              <button onClick={() => handleDownload(r.id)} className="btn-secondary px-4">
                Download
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No receipts yet" />
      )}
    </div>
  )
}
