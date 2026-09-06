import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DashboardCard } from '../components/DashboardCard'
import { ErrorState } from '../components/States'
import { SkeletonStatGrid } from '../components/Skeleton'
import { formatINR } from '../utils/money'
import { listProperties } from '../services/properties'
import {
  loadDashboardStats,
  loadMonthlyTrend,
  loadYoyComparison,
  loadActivityFeed,
  loadExpiringDocuments,
  loadMonthlyExpenseTotal,
} from '../services/dashboard'
import { CollectionTrendChart } from '../components/charts/CollectionTrendChart'
import { OccupancyDonut } from '../components/charts/OccupancyDonut'
import { ActivityFeed } from '../components/ActivityFeed'

export function DashboardPage() {
  const { profile } = useAuth()
  const ownerId = profile?.role === 'owner' ? profile.id : profile?.owner_id ?? ''
  const [searchParams, setSearchParams] = useSearchParams()
  const propertyId = searchParams.get('property') || undefined

  const { data: properties } = useQuery({
    queryKey: ['properties', ownerId],
    queryFn: () => listProperties(),
    enabled: !!ownerId,
  })

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['dashboard-stats', ownerId, propertyId],
    queryFn: () => loadDashboardStats(ownerId, propertyId),
    enabled: !!ownerId,
  })

  const { data: trend } = useQuery({
    queryKey: ['dashboard-trend', ownerId, propertyId],
    queryFn: () => loadMonthlyTrend(ownerId, propertyId),
    enabled: !!ownerId,
  })

  const { data: yoy } = useQuery({
    queryKey: ['dashboard-yoy', ownerId, propertyId],
    queryFn: () => loadYoyComparison(ownerId, propertyId),
    enabled: !!ownerId,
  })

  const { data: activity } = useQuery({
    queryKey: ['dashboard-activity', ownerId, propertyId],
    queryFn: () => loadActivityFeed(ownerId, propertyId),
    enabled: !!ownerId,
  })

  const { data: expiringDocs } = useQuery({
    queryKey: ['dashboard-expiring-docs', ownerId, propertyId],
    queryFn: () => loadExpiringDocuments(ownerId, propertyId),
    enabled: !!ownerId,
  })

  const { data: monthlyExpenses } = useQuery({
    queryKey: ['dashboard-monthly-expenses', ownerId, propertyId],
    queryFn: () => loadMonthlyExpenseTotal(ownerId, propertyId),
    enabled: !!ownerId,
  })

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Welcome</h1>
        <SkeletonStatGrid count={10} />
      </div>
    )
  }
  if (statsError) return <ErrorState message="Could not load dashboard." onRetry={() => refetchStats()} />
  if (!stats) return null

  const showSwitcher = (properties?.length ?? 0) > 1

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Welcome{profile ? `, ${profile.full_name}` : ''}</h1>
        {showSwitcher && (
          <select
            className="input w-auto py-2"
            value={propertyId ?? ''}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams)
              if (e.target.value) next.set('property', e.target.value)
              else next.delete('property')
              setSearchParams(next, { replace: true })
            }}
          >
            <option value="">All Properties</option>
            {properties?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <DashboardCard label="Properties" value={stats.properties} countTo={stats.properties} />
        <DashboardCard label="Rooms" value={stats.rooms} countTo={stats.rooms} />
        <DashboardCard label="Occupied" value={stats.occupied} tone="good" countTo={stats.occupied} />
        <DashboardCard label="Vacant" value={stats.vacant} tone="warn" countTo={stats.vacant} />
        <DashboardCard label="Active Tenants" value={stats.activeTenants} countTo={stats.activeTenants} />
        <DashboardCard label="Expected Rent" value={formatINR(stats.expectedRent)} countTo={stats.expectedRent} format={formatINR} />
        <DashboardCard label="Collected" value={formatINR(stats.collected)} tone="good" countTo={stats.collected} format={formatINR} />
        <DashboardCard label="Outstanding" value={formatINR(stats.outstanding)} tone="bad" countTo={stats.outstanding} format={formatINR} />
        <DashboardCard label="Credit Held" value={formatINR(stats.credit)} tone="warn" countTo={stats.credit} format={formatINR} />
        <DashboardCard
          label="Expenses (This Month)"
          value={formatINR(monthlyExpenses ?? 0)}
          tone="bad"
          countTo={monthlyExpenses ?? 0}
          format={formatINR}
        />
      </div>

      {yoy && (
        <div className="card flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{yoy.thisMonthLabel}:</span>
          <span className="text-slate-900 dark:text-slate-100">{formatINR(yoy.thisMonthCollected)}</span>
          <span className="text-slate-400 dark:text-slate-500">vs {formatINR(yoy.lastYearCollected)} same month last year</span>
          {yoy.changePct !== null && (
            <span className={`font-bold ${yoy.changePct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {yoy.changePct >= 0 ? '+' : ''}
              {yoy.changePct.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {trend && <CollectionTrendChart data={trend} />}
        <OccupancyDonut occupied={stats.occupied} vacant={stats.vacant} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
        <ActivityFeed items={activity ?? []} />
      </div>

      {(stats.unpaidBillsCount > 0 || stats.vacant > 0 || (expiringDocs && expiringDocs.length > 0)) && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Alerts</h2>
          <div className="space-y-2">
            {stats.unpaidBillsCount > 0 && (
              <div className="rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/40 px-4 py-3 text-orange-800 dark:text-orange-300">
                {stats.unpaidBillsCount} bill(s) unpaid or overdue.{' '}
                <Link to="/ledger" className="font-semibold underline">
                  View ledger
                </Link>
              </div>
            )}
            {stats.vacant > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-slate-700 dark:text-slate-300">
                {stats.vacant} room(s) vacant: {stats.vacantRoomsList.map((r) => r.room_number).join(', ')}
              </div>
            )}
            {expiringDocs && expiringDocs.length > 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-amber-800 dark:text-amber-300">
                <p className="font-semibold">{expiringDocs.length} document(s) expiring within 30 days:</p>
                <ul className="mt-1 list-inside list-disc">
                  {expiringDocs.map((d) => (
                    <li key={d.id}>
                      <Link to={`/tenants/${d.tenant_id}`} className="underline">
                        {d.tenant_name}
                      </Link>{' '}
                      — {d.file_name} (expires {new Date(d.expires_at).toLocaleDateString('en-IN')})
                    </li>
                  ))}
                </ul>
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
