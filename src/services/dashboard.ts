import { supabase } from '../lib/supabase'
import { formatINR } from '../utils/money'

export interface DashboardStats {
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

/** Loads the owner-dashboard stat cards, optionally scoped to one property. */
export async function loadDashboardStats(ownerId: string, propertyId?: string): Promise<DashboardStats> {
  let roomsQuery = supabase
    .from('rooms')
    .select('id, room_number, status, base_rent, property_id, properties!inner(owner_id)')
    .eq('properties.owner_id', ownerId)
  let tenantsQuery = supabase.from('tenants').select('id, status, property_id').eq('owner_id', ownerId)
  let billsQuery = supabase
    .from('bills')
    .select('total_due, total_paid, balance, status, property_id, properties!inner(owner_id)')
    .eq('properties.owner_id', ownerId)
  const propertiesQuery = supabase.from('properties').select('id').eq('owner_id', ownerId)

  if (propertyId) {
    roomsQuery = roomsQuery.eq('property_id', propertyId)
    tenantsQuery = tenantsQuery.eq('property_id', propertyId)
    billsQuery = billsQuery.eq('property_id', propertyId)
  }

  const [{ data: properties }, { data: rooms }, { data: tenants }, { data: bills }] = await Promise.all([
    propertiesQuery,
    roomsQuery,
    tenantsQuery,
    billsQuery,
  ])

  const roomsList = (rooms ?? []) as unknown as { id: string; room_number: string; status: string; base_rent: number }[]
  const tenantsList = (tenants ?? []) as { id: string; status: string }[]
  const billsList = (bills ?? []) as unknown as { total_due: number; total_paid: number; balance: number; status: string }[]

  const collected = billsList.reduce((s, b) => s + (b.total_paid || 0), 0)
  const outstanding = billsList.reduce((s, b) => s + (b.balance > 0 ? b.balance : 0), 0)
  const credit = billsList.reduce((s, b) => s + (b.balance < 0 ? Math.abs(b.balance) : 0), 0)
  const expectedRent = roomsList.filter((r) => r.status === 'occupied').reduce((s, r) => s + (r.base_rent || 0), 0)

  return {
    properties: propertyId ? 1 : properties?.length ?? 0,
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

export interface MonthlyTrendPoint {
  month: string // YYYY-MM-01
  label: string // "Jan '25"
  expected: number
  collected: number
}

/** Groups bills by billing_month for the last `months` calendar months
 * (including the current one), for the collection-trend chart. */
export async function loadMonthlyTrend(ownerId: string, propertyId?: string, months = 6): Promise<MonthlyTrendPoint[]> {
  let query = supabase
    .from('bills')
    .select('billing_month, total_due, total_paid, property_id, properties!inner(owner_id)')
    .eq('properties.owner_id', ownerId)
  if (propertyId) query = query.eq('property_id', propertyId)
  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as unknown as { billing_month: string; total_due: number; total_paid: number }[]

  const byMonth = new Map<string, { expected: number; collected: number }>()
  for (const r of rows) {
    const key = r.billing_month.slice(0, 7) // YYYY-MM
    const entry = byMonth.get(key) ?? { expected: 0, collected: 0 }
    entry.expected += r.total_due || 0
    entry.collected += r.total_paid || 0
    byMonth.set(key, entry)
  }

  const points: MonthlyTrendPoint[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const entry = byMonth.get(key) ?? { expected: 0, collected: 0 }
    points.push({
      month: `${key}-01`,
      label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      expected: entry.expected,
      collected: entry.collected,
    })
  }
  return points
}

export interface YoyComparison {
  thisMonthLabel: string
  thisMonthCollected: number
  lastYearCollected: number
  changePct: number | null // null when last year's month collected nothing (avoid divide-by-zero)
}

/** Compares this calendar month's collection to the same month a year ago.
 * Returns null when there isn't at least ~13 months of billing history, so
 * the caller can omit the comparison rather than show a misleading one. */
export async function loadYoyComparison(ownerId: string, propertyId?: string): Promise<YoyComparison | null> {
  let query = supabase
    .from('bills')
    .select('billing_month, total_paid, property_id, properties!inner(owner_id)')
    .eq('properties.owner_id', ownerId)
  if (propertyId) query = query.eq('property_id', propertyId)
  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as unknown as { billing_month: string; total_paid: number }[]
  if (rows.length === 0) return null

  const months = new Set(rows.map((r) => r.billing_month.slice(0, 7)))
  const now = new Date()
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), 1)
  const lastYearKey = `${lastYear.getFullYear()}-${String(lastYear.getMonth() + 1).padStart(2, '0')}`

  // Require a genuine span of ~13 months of history (not just 13 sparse
  // entries) and that data actually exists for the same month last year.
  const earliest = Array.from(months).sort()[0]
  const [ey, em] = earliest.split('-').map(Number)
  const monthsOfHistory = (now.getFullYear() - ey) * 12 + (now.getMonth() + 1 - em)
  if (monthsOfHistory < 12 || !months.has(lastYearKey)) return null

  const thisMonthCollected = rows.filter((r) => r.billing_month.startsWith(thisKey)).reduce((s, r) => s + (r.total_paid || 0), 0)
  const lastYearCollected = rows.filter((r) => r.billing_month.startsWith(lastYearKey)).reduce((s, r) => s + (r.total_paid || 0), 0)

  return {
    thisMonthLabel: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    thisMonthCollected,
    lastYearCollected,
    changePct: lastYearCollected > 0 ? ((thisMonthCollected - lastYearCollected) / lastYearCollected) * 100 : null,
  }
}

export interface ActivityItem {
  id: string
  kind: 'payment' | 'tenant' | 'revision' | 'bill'
  description: string
  at: string // ISO timestamp
}

/** Merges the last `limit` payments, tenant additions, rent revisions, and
 * bill generations across the owner's data into one reverse-chronological
 * feed. audit_log exists in the schema but isn't populated by these flows,
 * so the underlying tables are queried directly instead. */
export async function loadActivityFeed(ownerId: string, propertyId?: string, limit = 15): Promise<ActivityItem[]> {
  let paymentsQuery = supabase
    .from('payments')
    .select('id, amount, created_at, tenant_id, tenants!inner(full_name, owner_id, property_id)')
    .eq('tenants.owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(limit)
  let tenantsQuery = supabase
    .from('tenants')
    .select('id, full_name, created_at, property_id')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(limit)
  let revisionsQuery = supabase
    .from('rent_revisions')
    .select('id, rent_amount, created_at, tenant_id, tenants!inner(full_name, owner_id, property_id)')
    .eq('tenants.owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(limit)
  let billsQuery = supabase
    .from('bills')
    .select('id, billing_month, generated_at, tenant_id, property_id, properties!inner(owner_id), tenants(full_name)')
    .eq('properties.owner_id', ownerId)
    .order('generated_at', { ascending: false })
    .limit(limit)

  if (propertyId) {
    tenantsQuery = tenantsQuery.eq('property_id', propertyId)
    billsQuery = billsQuery.eq('property_id', propertyId)
    paymentsQuery = paymentsQuery.eq('tenants.property_id', propertyId)
    revisionsQuery = revisionsQuery.eq('tenants.property_id', propertyId)
  }

  const [{ data: payments }, { data: tenants }, { data: revisions }, { data: bills }] = await Promise.all([
    paymentsQuery,
    tenantsQuery,
    revisionsQuery,
    billsQuery,
  ])

  const items: ActivityItem[] = []

  for (const p of (payments ?? []) as unknown as {
    id: string
    amount: number
    created_at: string
    tenants: { full_name: string } | null
  }[]) {
    items.push({
      id: `payment-${p.id}`,
      kind: 'payment',
      description: `Payment of ${formatINR(p.amount)} recorded${p.tenants ? ` for ${p.tenants.full_name}` : ''}`,
      at: p.created_at,
    })
  }

  for (const t of (tenants ?? []) as { id: string; full_name: string; created_at: string }[]) {
    items.push({ id: `tenant-${t.id}`, kind: 'tenant', description: `Tenant ${t.full_name} added`, at: t.created_at })
  }

  for (const r of (revisions ?? []) as unknown as {
    id: string
    rent_amount: number
    created_at: string
    tenants: { full_name: string } | null
  }[]) {
    items.push({
      id: `revision-${r.id}`,
      kind: 'revision',
      description: `Rent revised to ${formatINR(r.rent_amount)}${r.tenants ? ` for ${r.tenants.full_name}` : ''}`,
      at: r.created_at,
    })
  }

  for (const b of (bills ?? []) as unknown as {
    id: string
    billing_month: string
    generated_at: string
    tenants: { full_name: string } | null
  }[]) {
    const monthLabel = new Date(b.billing_month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    items.push({
      id: `bill-${b.id}`,
      kind: 'bill',
      description: `Bill generated for ${monthLabel}${b.tenants ? ` — ${b.tenants.full_name}` : ''}`,
      at: b.generated_at,
    })
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit)
}
