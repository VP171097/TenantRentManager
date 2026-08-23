import { supabase } from '../lib/supabase'
import type { Bill, RentRevision } from '../types/database'

export async function listBills(filters: { tenantId?: string; propertyId?: string } = {}): Promise<Bill[]> {
  let query = supabase.from('bills').select('*').order('billing_month', { ascending: false })
  if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId)
  if (filters.propertyId) query = query.eq('property_id', filters.propertyId)
  const { data, error } = await query
  if (error) throw error
  return data as Bill[]
}

export async function getBill(id: string): Promise<Bill> {
  const { data, error } = await supabase.from('bills').select('*').eq('id', id).single()
  if (error) throw error
  return data as Bill
}

/** Idempotent bill generation via the DB function — safe to call twice for
 * the same tenant/month; the unique constraint + function logic returns
 * the existing bill instead of duplicating it. */
export async function generateBill(tenantId: string, billingMonth: string, otherCharges = 0, lateFee = 0): Promise<Bill> {
  const { data, error } = await supabase.rpc('fn_generate_bill', {
    p_tenant_id: tenantId,
    p_billing_month: billingMonth,
    p_other_charges: otherCharges,
    p_late_fee: lateFee,
  })
  if (error) throw error
  return data as Bill
}

/** Bulk-generates bills for every active tenant of a property for a month. */
export async function generateBillsForProperty(propertyId: string, billingMonth: string): Promise<Bill[]> {
  const { data: tenants, error: tErr } = await supabase
    .from('tenants')
    .select('id')
    .eq('property_id', propertyId)
    .eq('status', 'active')
  if (tErr) throw tErr

  const results: Bill[] = []
  for (const t of tenants ?? []) {
    results.push(await generateBill((t as { id: string }).id, billingMonth))
  }
  return results
}

/** Permanently deletes a bill. Cascades (per schema FKs) to any payments and
 * receipts recorded against it. Callers MUST confirm with the user before
 * calling this — it destroys payment history and cannot be undone. */
export async function deleteBill(id: string): Promise<void> {
  const { error } = await supabase.from('bills').delete().eq('id', id)
  if (error) throw error
}

/** Updates only the editable parts of a bill (other charges, late fee, notes)
 * via the DB function so total_due/balance/status are recomputed
 * consistently instead of drifting from the payments-trigger-driven total_paid. */
export async function updateBillCharges(input: {
  bill_id: string
  other_charges: number
  late_fee: number
  notes?: string
}): Promise<Bill> {
  const { data, error } = await supabase.rpc('fn_update_bill_charges', {
    p_bill_id: input.bill_id,
    p_other_charges: input.other_charges,
    p_late_fee: input.late_fee,
    p_notes: input.notes ?? null,
  })
  if (error) throw error
  return data as Bill
}

export async function listRentRevisions(tenantId: string): Promise<RentRevision[]> {
  const { data, error } = await supabase
    .from('rent_revisions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('effective_date', { ascending: false })
  if (error) throw error
  return data as RentRevision[]
}

export async function addRentRevision(input: {
  tenant_id: string
  effective_date: string
  rent_amount: number
  change_type: 'fixed' | 'percentage'
  change_value: number
  created_by?: string
}): Promise<RentRevision> {
  const { data, error } = await supabase.from('rent_revisions').insert(input).select().single()
  if (error) throw error
  return data as RentRevision
}
