import { useQuery } from '@tanstack/react-query'
import { listReceipts } from '../services/payments'
import { listTenants } from '../services/tenants'
import { supabase } from '../lib/supabase'
import { ErrorState, EmptyState } from '../components/States'
import { Skeleton, SkeletonList } from '../components/Skeleton'
import { ReceiptEmptyIcon } from '../components/EmptyIcons'
import { SearchBar } from '../components/SearchFilterBar'
import { useState } from 'react'
import { downloadReceiptPdf } from '../services/receiptPdf'

export function ReceiptsPage() {
  const { data: receipts, isLoading, error, refetch } = useQuery({ queryKey: ['receipts'], queryFn: () => listReceipts() })
  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: () => listTenants() })
  const [search, setSearch] = useState('')

  async function handleDownload(receiptId: string) {
    const receipt = receipts?.find((r) => r.id === receiptId)
    if (!receipt) return
    const [{ data: payment }, { data: bill }, { data: tenant }, { data: property }] = await Promise.all([
      supabase.from('payments').select('*').eq('id', receipt.payment_id).single(),
      supabase.from('bills').select('*').eq('tenant_id', receipt.tenant_id).order('billing_month', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('tenants').select('*').eq('id', receipt.tenant_id).single(),
      supabase.from('properties').select('*').eq('id', receipt.property_id).single(),
    ])
    if (payment && bill && tenant && property) downloadReceiptPdf({ receipt, payment, bill, tenant, property })
  }

  const filtered = (receipts ?? []).filter(
    (r) =>
      !search ||
      r.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
      tenants?.find((t) => t.id === r.tenant_id)?.full_name.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-12 w-full max-w-md" />
        <SkeletonList />
      </div>
    )
  }
  if (error) return <ErrorState message="Could not load receipts." onRetry={() => refetch()} />

  return (
    <div className="space-y-6 page-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Receipts</h1>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by receipt number or tenant…" />
      {filtered.length === 0 ? (
        <EmptyState title="No receipts yet" description="Generate a receipt after recording a payment." icon={<ReceiptEmptyIcon className="h-full w-full" />} />
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{r.receipt_number}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {tenants?.find((t) => t.id === r.tenant_id)?.full_name} ·{' '}
                  {new Date(r.generated_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              <button onClick={() => handleDownload(r.id)} className="btn-secondary px-4">
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
