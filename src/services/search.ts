import { supabase } from '../lib/supabase'

export interface SearchResult {
  id: string
  type: 'tenant' | 'room' | 'property' | 'receipt'
  label: string
  sublabel?: string
  to: string
}

/** Scoped to the current owner's data (RLS handles the actual scoping —
 * these are simple ilike queries against a handful of small tables, no
 * full-text search infrastructure needed at this scale). */
export async function globalSearch(term: string): Promise<SearchResult[]> {
  const q = term.trim()
  if (q.length < 2) return []
  const like = `%${q}%`

  const [tenantsByName, tenantsByPhone, rooms, properties, receipts] = await Promise.all([
    supabase.from('tenants').select('id, full_name, phone').ilike('full_name', like).limit(5),
    supabase.from('tenants').select('id, full_name, phone').ilike('phone', like).limit(5),
    supabase.from('rooms').select('id, room_number, property_id').ilike('room_number', like).limit(5),
    supabase.from('properties').select('id, name').ilike('name', like).limit(5),
    supabase.from('receipts').select('id, receipt_number, tenant_id').ilike('receipt_number', like).limit(5),
  ])

  const results: SearchResult[] = []
  const seenTenants = new Set<string>()

  for (const row of [...(tenantsByName.data ?? []), ...(tenantsByPhone.data ?? [])] as { id: string; full_name: string; phone: string }[]) {
    if (seenTenants.has(row.id)) continue
    seenTenants.add(row.id)
    results.push({ id: row.id, type: 'tenant', label: row.full_name, sublabel: row.phone, to: `/tenants/${row.id}` })
  }

  for (const row of (rooms.data ?? []) as { id: string; room_number: string; property_id: string }[]) {
    results.push({ id: row.id, type: 'room', label: `Room ${row.room_number}`, to: `/rooms/${row.id}` })
  }

  for (const row of (properties.data ?? []) as { id: string; name: string }[]) {
    results.push({ id: row.id, type: 'property', label: row.name, to: `/properties/${row.id}` })
  }

  for (const row of (receipts.data ?? []) as { id: string; receipt_number: string; tenant_id: string }[]) {
    results.push({ id: row.id, type: 'receipt', label: row.receipt_number, to: `/tenants/${row.tenant_id}` })
  }

  return results
}
