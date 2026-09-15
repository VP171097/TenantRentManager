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
import {
  Building2, Users, DoorOpen, Banknote, TrendingUp, Wallet,
  CreditCard, BookOpen, FileText, Receipt, User, AlertCircle, Calendar,
  ChevronRight, FileWarning, Home,
} from 'lucide-react'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

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
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <SkeletonStatGrid count={10} />
      </div>
    )
  }
  if (statsError) return <ErrorState message="Could not load dashboard." onRetry={() => refetchStats()} />
  if (!stats) return null

  const showSwitcher = (properties?.length ?? 0) > 1

  return (
    <div className="space-y-6 page-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {getGreeting()}{profile ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <Calendar size={13} />
            {formatDate()}
          </p>
        </div>
        {showSwitcher && (
          <select
            className="input w-auto py-2 text-sm"
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
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Hero collection band ── */}
      <div className="gradient-auth relative overflow-hidden rounded-2xl px-6 py-6 text-white shadow-lg">
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">This month's collection</p>
            <p className="font-display mt-1 text-4xl font-semibold tracking-tight tabular-nums">
              {formatINR(stats.collected)}
              <span className="ml-2 text-lg font-normal text-white/60">/ {formatINR(stats.expectedRent)}</span>
            </p>
            {stats.outstanding > 0 && (
              <p className="mt-1 text-sm text-gold-200">{formatINR(stats.outstanding)} still outstanding</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-32 overflow-hidden rounded-full bg-white/20 sm:w-48">
              <div
                className="h-full rounded-full bg-gold-400 transition-all duration-700"
                style={{
                  width: `${stats.expectedRent > 0 ? Math.min(100, Math.round((stats.collected / stats.expectedRent) * 100)) : 0}%`,
                }}
              />
            </div>
            <span className="font-display text-2xl font-semibold tabular-nums">
              {stats.expectedRent > 0 ? Math.round((stats.collected / stats.expectedRent) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Stat grid ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        <DashboardCard label="Properties"      value={stats.properties}              countTo={stats.properties}       icon={<Building2 size={16} />} to="/properties" />
        <DashboardCard label="Rooms"           value={stats.rooms}                   countTo={stats.rooms}            icon={<DoorOpen size={16} />} to="/rooms" />
        <DashboardCard label="Occupied"        value={stats.occupied}   tone="good"  countTo={stats.occupied}         icon={<Home size={16} />} to="/rooms" />
        <DashboardCard label="Vacant"          value={stats.vacant}     tone="warn"  countTo={stats.vacant}           icon={<DoorOpen size={16} />} to="/rooms" />
        <DashboardCard label="Active Tenants"  value={stats.activeTenants}           countTo={stats.activeTenants}    icon={<Users size={16} />} to="/tenants" />
        <DashboardCard label="Expected Rent"   value={formatINR(stats.expectedRent)} countTo={stats.expectedRent}    format={formatINR}  icon={<Banknote size={16} />} to="/billing" />
        <DashboardCard label="Collected"       value={formatINR(stats.collected)}    countTo={stats.collected}   tone="good" format={formatINR} icon={<TrendingUp size={16} />} to="/payments" />
        <DashboardCard label="Outstanding"     value={formatINR(stats.outstanding)}  countTo={stats.outstanding} tone="bad"  format={formatINR} icon={<AlertCircle size={16} />} to="/ledger" />
        <DashboardCard label="Credit Held"     value={formatINR(stats.credit)}       countTo={stats.credit}      tone="warn" format={formatINR} icon={<Wallet size={16} />} to="/ledger" />
        <DashboardCard label="Expenses (Month)" value={formatINR(monthlyExpenses ?? 0)} countTo={monthlyExpenses ?? 0} tone="bad" format={formatINR} icon={<Wallet size={16} />} to="/expenses" />
      </div>

      {/* ── YoY comparison ── */}
      {yoy && (
        <div className="card flex flex-wrap items-center gap-3 border-l-4 border-l-brand-500">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-600 dark:text-brand-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{yoy.thisMonthLabel}</span>
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatINR(yoy.thisMonthCollected)}</span>
          <span className="text-sm text-slate-400 dark:text-slate-500">vs {formatINR(yoy.lastYearCollected)} same month last year</span>
          {yoy.changePct !== null && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${yoy.changePct >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
              {yoy.changePct >= 0 ? '+' : ''}{yoy.changePct.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {trend && <CollectionTrendChart data={trend} />}
        <OccupancyDonut occupied={stats.occupied} vacant={stats.vacant} />
      </div>

      {/* ── Quick actions + Activity ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <QuickAction to="/tenants"  label="Add Tenant"       icon={<User size={20} />}     color="from-violet-500 to-purple-600" />
            <QuickAction to="/payments" label="Add Payment"      icon={<CreditCard size={20} />} color="from-emerald-500 to-teal-600" />
            <QuickAction to="/billing"  label="Generate Bills"   icon={<FileText size={20} />}  color="from-brand-500 to-indigo-600" />
            <QuickAction to="/ledger"   label="View Ledger"      icon={<BookOpen size={20} />}  color="from-amber-500 to-orange-600" />
            <QuickAction to="/receipts" label="Receipts"         icon={<Receipt size={20} />}   color="from-sky-500 to-blue-600" />
          </div>
        </div>
        <ActivityFeed items={activity ?? []} />
      </div>

      {/* ── Alerts ── */}
      {(stats.unpaidBillsCount > 0 || stats.vacant > 0 || (expiringDocs && expiringDocs.length > 0)) && (
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Alerts</h2>
          <div className="space-y-2">
            {stats.unpaidBillsCount > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 px-4 py-3 border-l-4 border-l-orange-500">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-orange-500" />
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  {stats.unpaidBillsCount} bill(s) unpaid or overdue.{' '}
                  <Link to="/ledger" className="font-semibold underline underline-offset-2">View ledger</Link>
                </p>
              </div>
            )}
            {stats.vacant > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 border-l-4 border-l-slate-400">
                <DoorOpen size={16} className="mt-0.5 shrink-0 text-slate-400" />
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {stats.vacant} room(s) vacant: <span className="font-medium">{stats.vacantRoomsList.map((r) => r.room_number).join(', ')}</span>
                </p>
              </div>
            )}
            {expiringDocs && expiringDocs.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 border-l-4 border-l-amber-500">
                <FileWarning size={16} className="mt-0.5 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{expiringDocs.length} document(s) expiring within 30 days</p>
                  <ul className="mt-1 space-y-0.5">
                    {expiringDocs.map((d) => (
                      <li key={d.id} className="text-xs text-amber-700 dark:text-amber-400">
                        <Link to={`/tenants/${d.tenant_id}`} className="underline font-medium">{d.tenant_name}</Link>
                        {' '}— {d.file_name} (expires {new Date(d.expires_at).toLocaleDateString('en-IN')})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function QuickAction({
  to,
  label,
  icon,
  color,
}: {
  to: string
  label: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-start gap-3 rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-sm`}>
        {icon}
      </div>
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
      </div>
    </Link>
  )
}

