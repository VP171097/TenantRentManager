import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'
import { LedgerTable } from '../../components/LedgerTable'
import type { Bill, Tenant } from '../../types/database'

async function loadLedger(profileId: string) {
  const { data: tenant, error: tErr } = await supabase.from('tenants').select('*').eq('profile_id', profileId).single()
  if (tErr) throw tErr
  const { data: bills, error: bErr } = await supabase
    .from('bills')
    .select('*')
    .eq('tenant_id', (tenant as Tenant).id)
    .order('billing_month', { ascending: false })
  if (bErr) throw bErr
  return (bills ?? []) as Bill[]
}

export function TenantLedgerPage() {
  const { profile } = useAuth()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-ledger', profile?.id],
    queryFn: () => loadLedger(profile!.id),
    enabled: !!profile,
  })

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message="Could not load your ledger." onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">My Ledger</h1>
      {data && data.length > 0 ? <LedgerTable bills={data} /> : <EmptyState title="No bills yet" />}
    </div>
  )
}
