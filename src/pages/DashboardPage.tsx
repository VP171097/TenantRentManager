import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { CollectionRing } from '../components/CollectionRing'
import { Sparkline } from '../components/Sparkline'
import { currentBillingMonth } from '../utils/dashboard'
import { ErrorState } from '../components/States'
import { SkeletonStatGrid } from '../components/Skeleton'
import { formatINR } from '../utils/money'
import { listProperties } from '../services/properties'
import {
  loadDashboardStats,
  loadMonthlyTrend,
  loadActivityFeed,
  loadExpiringDocuments,
  loadMonthlyExpenseTotal,
} from '../services/dashboard'
import { CollectionTrendChart } from '../components/charts/CollectionTrendChart'
import { OccupancyDonut } from '../components/charts/OccupancyDonut'
import { ActivityFeed } from '../components/ActivityFeed'
import { canShare, shareLink } from '../utils/share'
import { appUrl } from '../utils/routes'
import {
  Building2, Users, DoorOpen, Wallet, CreditCard, FileText, AlertCircle,
  Calendar, ChevronRight, CheckCircle2, Zap, RefreshCw, ArrowUpRight, Share2,
} from 'lucide-react'

async function handleShareApp() {
  await shareLink({
    title: 'RentSlate — Rent, Simplified',
    text: 'I manage my rentals with RentSlate — rent, electricity bills and receipts, all in one place. Give it a try:',
    url: appUrl('/'),
  })
}

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
  const rawMonth = searchParams.get('month') ?? ''
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : currentBillingMonth()
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

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
    queryKey: ['dashboard-stats', ownerId, propertyId, month],
    queryFn: () => loadDashboardStats(ownerId, propertyId, month),
    enabled: !!ownerId,
  })

  const trendQuery = useQuery({
    queryKey: ['dashboard-trend', ownerId, propertyId, month],
    queryFn: () => loadMonthlyTrend(ownerId, propertyId, 6, month),
    enabled: !!ownerId,
  })

  const activityQuery = useQuery({
    queryKey: ['dashboard-activity', ownerId, propertyId],
    queryFn: () => loadActivityFeed(ownerId, propertyId),
    enabled: !!ownerId,
  })

  const docsQuery = useQuery({
    queryKey: ['dashboard-expiring-docs', ownerId, propertyId],
    queryFn: () => loadExpiringDocuments(ownerId, propertyId),
    enabled: !!ownerId,
  })

  const expenseQuery = useQuery({
    queryKey: ['dashboard-monthly-expenses', ownerId, propertyId, month],
    queryFn: () => loadMonthlyExpenseTotal(ownerId, propertyId, month),
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

  const trend = trendQuery.data ?? []
  const changeFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value); else next.delete(key)
    setSearchParams(next, { replace: true })
  }
  return <div className="space-y-6 page-fade-in">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p data-testid="dashboard-eyebrow" className="eyebrow text-brand-700 dark:text-brand-300">Your money cockpit</p><h1 data-testid="dashboard-greeting" className="mt-2 text-3xl font-medium">{getGreeting()}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.</h1><p data-testid="dashboard-date" className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"><Calendar size={13} />{formatDate()}</p></div>
      <div className="flex flex-wrap gap-2"><select data-testid="dashboard-property-filter" aria-label="Filter by property" className="input !w-auto !py-2 text-sm" value={propertyId ?? ''} onChange={e => changeFilter('property', e.target.value)}><option value="">All properties</option>{properties?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input data-testid="dashboard-month-filter" aria-label="Billing month" type="month" className="input !w-auto !py-2 text-sm" value={month} onChange={e => changeFilter('month', e.target.value)} /><button data-testid="dashboard-refresh" aria-label="Refresh dashboard" className="btn-secondary !px-3" onClick={() => { void refetchStats(); void trendQuery.refetch(); void expenseQuery.refetch(); void activityQuery.refetch(); void docsQuery.refetch() }}><RefreshCw size={16} /></button></div>
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
      <section data-testid="collection-summary" className="ledger-panel ledger-grid rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5"><div className="min-w-0"><p data-testid="collection-period" className="eyebrow text-brand-100">{monthLabel} · Bill collections</p><p data-testid="collection-total" className="mt-4 break-all font-mono text-3xl font-medium sm:text-4xl">{formatINR(stats.collected)}</p><p data-testid="collection-billed" className="mt-2 text-sm text-brand-100">received against {formatINR(stats.billed)} billed</p></div><CollectionRing id="collection" percent={stats.collectionPercent} /></div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5"><p data-testid="collection-outstanding" className="text-sm text-gold-200">{stats.billCount === 0 ? 'No bills for this period. A fresh start.' : stats.outstanding > 0 ? `${formatINR(stats.outstanding)} left to collect` : 'All billed dues collected. Nicely done.'}</p><Link data-testid="collection-record-payment" className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20" to="/payments">Record payment <ArrowUpRight size={15} /></Link></div>
      </section>
      <section className="card flex flex-col justify-between !p-6"><div><p data-testid="dashboard-actions-heading" className="eyebrow text-slate-600 dark:text-slate-300">Less admin. More done.</p><h2 data-testid="dashboard-actions-title" className="mt-2 text-2xl">Make your next move.</h2></div><div className="mt-5 space-y-2">{[{ to: '/billing', label: 'Read meters & generate bills', icon: <Zap size={17} />, id: 'bills' }, { to: '/payments', label: 'Record a payment', icon: <CreditCard size={17} />, id: 'payment' }, { to: '/tenants', label: 'Manage your tenants', icon: <Users size={17} />, id: 'tenants' }].map(a => <Link key={a.id} data-testid={`dashboard-action-${a.id}`} to={a.to} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-medium hover:bg-brand-50 dark:bg-slate-800 dark:hover:bg-brand-950"><span className="text-brand-700 dark:text-brand-300">{a.icon}</span><span className="flex-1">{a.label}</span><ChevronRight size={14} /></Link>)}
      {canShare() && <button data-testid="dashboard-action-share" type="button" onClick={handleShareApp} className="flex w-full items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-medium hover:bg-brand-50 dark:bg-slate-800 dark:hover:bg-brand-950"><span className="text-brand-700 dark:text-brand-300"><Share2 size={17} /></span><span className="flex-1 text-left">Refer RentSlate to another owner</span><ChevronRight size={14} /></button>}
      </div></section>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { id: 'billed', label: 'Total billed', value: formatINR(stats.billed), to: '/billing', points: trend.map(p => p.expected), note: `${stats.billCount} bills · selected month` },
      { id: 'collected', label: 'Collected', value: formatINR(stats.collected), to: '/payments', points: trend.map(p => p.collected), note: 'Payments against selected bills' },
      { id: 'outstanding', label: 'Outstanding', value: formatINR(stats.outstanding), to: '/ledger', points: trend.map(p => Math.max(0, p.expected - p.collected)), note: `${stats.unpaidBillsCount} bills with a balance` },
      { id: 'expenses', label: 'Monthly expenses', value: expenseQuery.isError ? 'Unavailable' : expenseQuery.isPending ? 'Loading…' : formatINR(expenseQuery.data ?? 0), to: '/expenses', points: [], note: 'Expense dates in selected month' },
    ].map(k => <Link data-testid={`kpi-${k.id}`} key={k.id} to={k.to} className="card metric-card !p-5"><div className="flex justify-between text-sm text-slate-600 dark:text-slate-300"><span data-testid={`kpi-${k.id}-label`}>{k.label}</span><ArrowUpRight size={15} /></div><p data-testid={`kpi-${k.id}-value`} className="mt-3 break-all font-mono text-2xl font-medium">{k.value}</p><div className="mt-3 flex items-end justify-between gap-2"><p data-testid={`kpi-${k.id}-note`} className="max-w-32 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">{k.note}</p>{k.id !== 'expenses' && <Sparkline id={k.id} values={k.points} label={`${k.label} over six billing months`} />}</div></Link>)}</div>
    <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <section className="card !p-0 overflow-hidden"><div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800"><h2 data-testid="triage-title" className="text-xl">Needs your attention</h2><span data-testid="triage-period" className="text-xs text-slate-600 dark:text-slate-300">{monthLabel}</span></div>
        {stats.attentionBills.length === 0 ? <div data-testid="triage-empty" className="flex items-center gap-3 p-6 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="shrink-0 text-brand-700 dark:text-brand-300" />{stats.billCount ? 'All clear. No bills waiting for attention.' : 'No bills yet. Generate your first monthly bills to start tracking.'}</div> : stats.attentionBills.map(b => <Link data-testid={`triage-bill-${b.id}`} key={b.id} to={`/tenants/${b.tenantId}`} className="flex items-center gap-3 border-b border-slate-100 p-4 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"><span className={`rounded-xl p-2.5 ${b.markedPaid ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'bg-gold-50 text-gold-700 dark:bg-gold-950 dark:text-gold-300'}`}>{b.markedPaid ? <CreditCard size={17} /> : <AlertCircle size={17} />}</span><div className="min-w-0 flex-1"><p data-testid={`triage-name-${b.id}`} className="truncate text-sm font-semibold">{b.name}</p><p data-testid={`triage-reason-${b.id}`} className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{b.markedPaid ? 'Tenant says paid · verify receipt' : b.status === 'overdue' ? 'Overdue · follow up' : b.status === 'partial' ? 'Part payment · balance remaining' : 'Awaiting payment'}</p></div><span data-testid={`triage-amount-${b.id}`} className="font-mono text-xs font-medium">{formatINR(b.balance)}</span><ChevronRight size={15} /></Link>)}
        <Link data-testid="triage-view-ledger" to="/ledger" className="flex items-center justify-between p-4 text-sm font-semibold text-brand-700 dark:text-brand-300">Open full ledger <ArrowUpRight size={16} /></Link>
      </section>
      <section className="card !p-5"><h2 data-testid="portfolio-heading" className="text-xl">Your spaces, today</h2><p data-testid="portfolio-period" className="mt-1 text-xs text-slate-600 dark:text-slate-300">Current occupancy · independent of billing month</p><div className="mt-5 grid grid-cols-3 gap-3">{[{ label: 'Properties', value: stats.properties, icon: <Building2 size={17} />, to: '/properties' }, { label: 'Rooms', value: stats.rooms, icon: <DoorOpen size={17} />, to: '/rooms' }, { label: 'Tenants', value: stats.activeTenants, icon: <Users size={17} />, to: '/tenants' }].map((p, i) => <Link data-testid={`portfolio-stat-${i}`} key={p.label} to={p.to} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><span className="text-brand-700 dark:text-brand-300">{p.icon}</span><p className="mt-3 font-mono text-xl">{p.value}</p><p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{p.label}</p></Link>)}</div><Link data-testid="portfolio-vacant" to="/rooms" className="mt-5 flex items-center gap-2 text-sm text-gold-800 dark:text-gold-200"><DoorOpen size={16} />{stats.vacant} vacant · {stats.occupied} occupied<ChevronRight size={14} /></Link><p data-testid="portfolio-credit" className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-4 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"><Wallet size={15} />Credit on selected bills: {formatINR(stats.credit)}</p></section>
    </div>
    {trendQuery.isError && <p role="alert" data-testid="trend-error" className="text-sm text-red-700 dark:text-red-300">Collection history couldn't load. Use Refresh to try again.</p>}
    <div className="grid gap-4 lg:grid-cols-2">{trendQuery.data && <CollectionTrendChart data={trend} />}<OccupancyDonut occupied={stats.occupied} vacant={stats.vacant} /></div>
    {activityQuery.isError ? <p data-testid="activity-error" role="alert" className="text-sm text-red-700 dark:text-red-300">Recent activity couldn't load. Use Refresh to try again.</p> : <ActivityFeed items={activityQuery.data ?? []} />}
    {docsQuery.isError && <p data-testid="documents-error" role="alert" className="text-sm text-red-700 dark:text-red-300">Document expiry checks unavailable. Use Refresh to try again.</p>}
    {!!docsQuery.data?.length && <section className="card"><h2 data-testid="documents-expiring-title" className="flex items-center gap-2 text-lg"><FileText size={18} />Documents expiring in 30 days</h2>{docsQuery.data.map(d => <Link data-testid={`document-expiring-${d.id}`} key={d.id} to={`/tenants/${d.tenant_id}`} className="mt-2 block text-sm text-brand-700 underline dark:text-brand-300">{d.tenant_name} · {d.file_name} · {d.expires_at}</Link>)}</section>}
  </div>
}

