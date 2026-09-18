import { supabase } from '../lib/supabase'
import { resolveLastElectricityReading } from './electricity'
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
  /** False when the tenant's room has electricity turned off (migration
   * 039) — no reading is required or recorded for them; their bill's
   * electricity charge is simply 0. */
  electricity_enabled: boolean
}

export async function getBillingPreview(propertyId: string, billingMonth: string): Promise<BillingPreviewItem[]> {
  const { data: tenants, error: tErr } = await supabase
    .from('tenants')
    .select('id, full_name, room_id, electricity_start_reading, electricity_rate, rooms(room_number, electricity_rate, electricity_enabled)')
    .eq('property_id', propertyId)
    .eq('status', 'active')
  if (tErr) throw tErr

  const results: BillingPreviewItem[] = []
  for (const t of tenants ?? []) {
    const room = t.rooms as any
    const electricityEnabled = room?.electricity_enabled !== false
    // "Previous Unit" should always carry forward from the last CHARGED
    // bill, never silently reset to 0 — including skipping over any
    // "Skip / Carry Forward" months, which contribute 0 electricity units
    // and no reading snapshot. See resolveLastElectricityReading's doc
    // comment for the full fallback chain. Skipped entirely for a room
    // with electricity turned off — there's nothing to resolve.
    const lastReading = electricityEnabled ? await resolveLastElectricityReading(t.id, billingMonth) : 0

    results.push({
      tenant_id: t.id,
      room_id: t.room_id!,
      full_name: t.full_name,
      room_number: room?.room_number ?? '',
      last_reading: lastReading,
      rate_per_unit: t.electricity_rate || room?.electricity_rate || 0,
      electricity_enabled: electricityEnabled,
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
  /** False when the room has electricity turned off — no
   * electricity_readings row is written at all for this tenant/month. */
  electricity_enabled: boolean
}

/** Bulk-generates bills for active tenants. Always records an
 * electricity_readings row (migration 032 — the single source of truth
 * for monthly electricity data) — "Skip / Carry Forward" still records
 * the real reading (is_billed: false), it just doesn't charge for it
 * this month; fn_generate_bill reads that flag to decide the bill's
 * electricity charge. */
export async function generateBillsForProperty(propertyId: string, billingMonth: string, inputs: BillGenerationInput[]): Promise<Bill[]> {
  const results: Bill[] = []
  if (!inputs.length) return results
  // Validate the entire batch before the first write. Keep existing bills
  // AND their readings unchanged when a user repeats generation. Rooms
  // with electricity turned off never had a reading to validate.
  for (const input of inputs) {
    if (!input.electricity_enabled) continue
    if (![input.current_reading, input.last_reading, input.rate_per_unit].every(Number.isFinite) || input.last_reading < 0 || input.current_reading < input.last_reading || input.rate_per_unit < 0) {
      throw new Error('Check meter readings and rates before generating bills.')
    }
  }
  const { data: existing, error: existingError } = await supabase.from('bills').select('*').eq('property_id', propertyId).eq('billing_month', billingMonth).in('tenant_id', inputs.map(i => i.tenant_id))
  if (existingError) throw existingError
  const existingByTenant = new Map((existing as Bill[]).map(b => [b.tenant_id, b]))

  for (const input of inputs) {
    const alreadyGenerated = existingByTenant.get(input.tenant_id)
    if (alreadyGenerated) { results.push(alreadyGenerated); continue }
    // No electricity for this room — skip the reading entirely rather
    // than writing a 0/0 row; fn_generate_bill already produces a
    // correct ₹0 electricity charge when no reading row exists.
    if (input.electricity_enabled) {
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
            is_billed: !input.skip_electricity,
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
  /** Whether electricity should be charged on this bill, or just
   * recorded and deferred to a later bill. Defaults to true. */
  is_billed?: boolean
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
    p_is_billed: input.is_billed ?? true,
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
