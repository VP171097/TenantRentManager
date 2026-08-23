import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { LoadingState, ErrorState } from '../../components/States'
import { BillSummary } from '../../components/BillSummary'
import { formatINR } from '../../utils/money'
import type { Bill, Tenant } from '../../types/database'

async function loadMyData(profileId: string) {
  const { data: tenant, error: tErr } = await supabase.from('tenants').select('*').eq('profile_id', profileId).single()
  if (tErr) throw tErr
  const { data: bills, error: bErr } = await supabase
    .from('bills')
    .select('*')
    .eq('tenant_id', (tenant as Tenant).id)
    .order('billing_month', { ascending: false })
  if (bErr) throw bErr
  return { tenant: tenant as Tenant, bills: (bills ?? []) as Bill[] }
}

export function TenantDashboardPage() {
  const { profile } = useAuth()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-data', profile?.id],
    queryFn: () => loadMyData(profile!.id),
    enabled: !!profile,
  })

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState message="Could not load your account." onRetry={() => refetch()} />

  const latestBill = data.bills[0]
  const totalOutstanding = data.bills.reduce((s, b) => s + (b.balance > 0 ? b.balance : 0), 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Hi, {data.tenant.full_name}</h1>
      <div className="card">
        <p className="text-sm text-slate-500">Total outstanding</p>
        <p className={`text-2xl font-bold ${totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {formatINR(totalOutstanding)}
        </p>
      </div>
      {latestBill ? <BillSummary bill={latestBill} /> : <p className="text-slate-500">No bills yet.</p>}
    </div>
  )
}
