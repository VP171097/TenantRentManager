import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { DashboardCard } from '../components/DashboardCard'
import { ErrorState } from '../components/States'
import { SkeletonStatGrid } from '../components/Skeleton'
import { formatINR } from '../utils/money'

interface DashboardStats {
  properties: number
  rooms: number
  occupied: number
  vacant: number
  activeTenants: number
  expectedRent: number
  collected: number
  outstanding: number
  credit: number
  unpaidBillsCount: number
  vacantRoomsList: { id: string; room_number: string }[]
}

async function loadStats(ownerId: string): Promise<DashboardStats> {
  const [{ data: properties }, { data: rooms }, { data: tenants }, { data: bills }] = await Promise.all([
    supabase.from('properties').select('id').eq('owner_id', ownerId),
    supabase.from('rooms').select('id, room_number, status, base_rent, property_id, properties!inner(owner_id)').eq('properties.owner_id', ownerId),
    supabase.from('tenants').select('id, status').eq('owner_id', ownerId),
    supabase.from('bills').select('total_due, total_paid, balance, status, property_id, properties!inner(owner_id)').eq('properties.owner_id', ownerId),
  ])

  const roomsList = (rooms ?? []) as unknown as { id: string; room_number: string; status: string; base_rent: number }[]
  const tenantsList = (tenants ?? []) as { id: string; status: string }[]
  const billsList = (bills ?? []) as unknown as { total_due: number; total_paid: number; balance: number; status: string }[]

  const collected = billsList.reduce((s, b) => s + (b.total_paid || 0), 0)
  const outstanding = billsList.reduce((s, b) => s + (b.balance > 0 ? b.balance : 0), 0)
  const credit = billsList.reduce((s, b) => s + (b.balance < 0 ? Math.abs(b.balance) : 0), 0)
  const expectedRent = roomsList.filter((r) => r.status === 'occupied').reduce((s, r) => s + (r.base_rent || 0), 0)

  return {
    properties: properties?.length ?? 0,
    rooms: roomsList.length,
    occupied: roomsList.filter((r) => r.status === 'occupied').length,
    vacant: roomsList.filter((r) => r.status === 'vacant').length,
    activeTenants: tenantsList.filter((t) => t.status === 'active').length,
    expectedRent,
    collected,
    outstanding,
    credit,
    unpaidBillsCount: billsList.filter((b) => b.status === 'unpaid' || b.status === 'overdue').length,
    vacantRoomsList: roomsList.filter((r) => r.status === 'vacant').map((r) => ({ id: r.id, room_number: r.room_number })),
  }
}

export function DashboardPage() {
  const { profile } = useAuth()
  const ownerId = profile?.role === 'owner' ? profile.id : profile?.owner_id ?? ''
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats', ownerId],
    queryFn: () => loadStats(ownerId),
    enabled: !!ownerId,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Welcome</h1>
        <SkeletonStatGrid count={9} />
      </div>
    )
  }
  if (error) return <ErrorState message="Could not load dashboard." onRetry={() => refetch()} />
  if (!data) return null

  return (
    <div className="space-y-6 page-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Welcome{profile ? `, ${profile.full_name}` : ''}</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <DashboardCard label="Properties" value={data.properties} countTo={data.properties} />
        <DashboardCard label="Rooms" value={data.rooms} countTo={data.rooms} />
        <DashboardCard label="Occupied" value={data.occupied} tone="good" countTo={data.occupied} />
        <DashboardCard label="Vacant" value={data.vacant} tone="warn" countTo={data.vacant} />
        <DashboardCard label="Active Tenants" value={data.activeTenants} countTo={data.activeTenants} />
        <DashboardCard label="Expected Rent" value={formatINR(data.expectedRent)} countTo={data.expectedRent} format={formatINR} />
        <DashboardCard label="Collected" value={formatINR(data.collected)} tone="good" countTo={data.collected} format={formatINR} />
        <DashboardCard label="Outstanding" value={formatINR(data.outstanding)} tone="bad" countTo={data.outstanding} format={formatINR} />
        <DashboardCard label="Credit Held" value={formatINR(data.credit)} tone="warn" countTo={data.credit} format={formatINR} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <QuickAction to="/tenants" label="Add Tenant" icon="👤" />
          <QuickAction to="/payments" label="Add Payment" icon="💳" />
          <QuickAction to="/billing" label="Generate Bills" icon="🧾" />
          <QuickAction to="/ledger" label="View Ledger" icon="📒" />
          <QuickAction to="/receipts" label="Generate Receipt" icon="🧻" />
        </div>
      </div>

      {(data.unpaidBillsCount > 0 || data.vacant > 0) && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Alerts</h2>
          <div className="space-y-2">
            {data.unpaidBillsCount > 0 && (
              <div className="rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/40 px-4 py-3 text-orange-800 dark:text-orange-300">
                {data.unpaidBillsCount} bill(s) unpaid or overdue.{' '}
                <Link to="/ledger" className="font-semibold underline">
                  View ledger
                </Link>
              </div>
            )}
            {data.vacant > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-slate-700 dark:text-slate-300">
                {data.vacant} room(s) vacant: {data.vacantRoomsList.map((r) => r.room_number).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function QuickAction({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white dark:bg-slate-800 p-5 text-center shadow-sm border border-slate-100 dark:border-slate-700 transition-shadow hover:shadow-md active:scale-[0.97]"
    >
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
    </Link>
  )
}
