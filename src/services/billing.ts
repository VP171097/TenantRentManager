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

export interface BillingPreviewItem {
  tenant_id: string
  room_id: string
  full_name: string
  room_number: string
  last_reading: number
  rate_per_unit: number
}

export async function getBillingPreview(propertyId: string, billingMonth: string): Promise<BillingPreviewItem[]> {
  const { data: tenants, error: tErr } = await supabase
    .from('tenants')
    .select('id, full_name, room_id, electricity_start_reading, electricity_rate, rooms(room_number, electricity_rate)')
    .eq('property_id', propertyId)
    .eq('status', 'active')
  if (tErr) throw tErr

  const results: BillingPreviewItem[] = []
  for (const t of tenants ?? []) {
    // Find the latest electricity reading for this tenant
    const { data: lastReading } = await supabase
      .from('electricity_readings')
      .select('current_reading')
      .eq('tenant_id', t.id)
      .lt('billing_month', billingMonth)
      .order('billing_month', { ascending: false })
      .limit(1)
      .maybeSingle()

    results.push({
      tenant_id: t.id,
      room_id: t.room_id!,
      full_name: t.full_name,
      room_number: (t.rooms as any)?.room_number ?? '',
      last_reading: lastReading ? lastReading.current_reading : (t.electricity_start_reading ?? 0),
      rate_per_unit: t.electricity_rate || (t.rooms as any)?.electricity_rate || 0,
    })
  }
  return results
}

export interface BillGenerationInput {
  tenant_id: string
  room_id: string
  last_reading: number
  current_reading: number
  rate_per_unit: number
  skip_electricity: boolean
}

/** Bulk-generates bills for active tenants, inserting electricity readings if provided. */
export async function generateBillsForProperty(_propertyId: string, billingMonth: string, inputs: BillGenerationInput[]): Promise<Bill[]> {
  const results: Bill[] = []
  
  for (const input of inputs) {
    if (!input.skip_electricity) {
      // Upsert electricity reading
      const { error: elecErr } = await supabase
        .from('electricity_readings')
        .upsert(
          {
            tenant_id: input.tenant_id,
            room_id: input.room_id,
            billing_month: billingMonth,
            previous_reading: input.last_reading,
            current_reading: input.current_reading,
            rate_per_unit: input.rate_per_unit,
            is_meter_reset: false,
          },
          { onConflict: 'tenant_id, billing_month' }
        )
      if (elecErr) throw elecErr
    }
    
    results.push(await generateBill(input.tenant_id, billingMonth))
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

/** Tenant self-service: flags a bill as "I've paid" (does not touch real
 * financial fields) via a SECURITY DEFINER RPC that verifies the caller
 * owns this bill's tenant record. */
export async function markBillAsPaidByTenant(billId: string, note?: string): Promise<Bill> {
  const { data, error } = await supabase.rpc('fn_tenant_mark_paid', {
    p_bill_id: billId,
    p_note: note ?? null,
  })
  if (error) throw error
  return data as Bill
}

/** Owner/manager (with can_record_payments) dismisses a tenant's "I've
 * paid" claim without recording a payment — e.g. a mistaken claim. */
export async function dismissTenantPaidFlag(billId: string): Promise<Bill> {
  const { data, error } = await supabase.rpc('fn_dismiss_tenant_paid_flag', {
    p_bill_id: billId,
  })
  if (error) throw error
  return data as Bill
}

/** Updates ALL correctable fields of an already-generated bill: rent
 * (manual override), the electricity reading inputs (also keeping the
 * backing electricity_readings row in sync so a later "Generate Bill"
 * click doesn't silently return stale numbers), and other charges/late
 * fee/notes — via the DB function so total_due/balance/status stay
 * derived consistently. billing_month, previous_balance and
 * previous_credit are intentionally not editable. */
export async function updateBillFull(input: {
  bill_id: string
  rent_amount: number
  previous_reading: number
  current_reading: number
  rate_per_unit: number
  is_meter_reset: boolean
  other_charges: number
  late_fee: number
  notes?: string
}): Promise<Bill> {
  const { data, error } = await supabase.rpc('fn_update_bill_full', {
    p_bill_id: input.bill_id,
    p_rent_amount: input.rent_amount,
    p_previous_reading: input.previous_reading,
    p_current_reading: input.current_reading,
    p_rate_per_unit: input.rate_per_unit,
    p_is_meter_reset: input.is_meter_reset,
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
