import { supabase } from '../lib/supabase'
import type { ElectricityReading } from '../types/database'

export async function listElectricityReadings(filters: { tenantId?: string; roomId?: string } = {}): Promise<ElectricityReading[]> {
  let query = supabase.from('electricity_readings').select('*').order('billing_month', { ascending: false })
  if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId)
  if (filters.roomId) query = query.eq('room_id', filters.roomId)
  const { data, error } = await query
  if (error) throw error
  return data as ElectricityReading[]
}

export async function getLatestReading(tenantId: string): Promise<ElectricityReading | null> {
  const { data, error } = await supabase
    .from('electricity_readings')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('billing_month', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as ElectricityReading | null
}

/** Looks up the exact electricity_readings row for a given bill's month
 * (tenant_id + billing_month), used by the bill/receipt PDF builders to
 * show previous/current readings and the rate applied. Returns null if
 * none exists (e.g. an older bill predating readings, or a synthetic
 * move-out settlement bill) — callers should omit those PDF rows rather
 * than throwing. */
export async function getReadingForMonth(tenantId: string, billingMonth: string): Promise<ElectricityReading | null> {
  const { data, error } = await supabase
    .from('electricity_readings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('billing_month', billingMonth)
    .maybeSingle()
  if (error) throw error
  return data as ElectricityReading | null
}

/** Resolves the correct "previous reading" to carry forward for a
 * tenant's next bill (migration 032 — electricity_readings is now
 * always written, including for a "Skip / Carry Forward" month, with an
 * is_billed flag). Finds the most recent row with is_billed = true and
 * returns its current_reading — a "Skip / Carry Forward" row (is_billed
 * = false) is correctly skipped over, exactly matching "August 0->250
 * paid, September skipped, October should start from 250".
 *
 * Falls back to the old bill-snapshot/cumulative-sum logic only for
 * tenants whose history predates migration 032 (no is_billed = true row
 * exists at all, e.g. every past month happens to have been a skip) —
 * this fallback can never come back null.
 *
 * Pass `beforeBillingMonth` to resolve as of a specific month (e.g. when
 * defaulting the "Previous meter reading" field while editing/generating
 * a specific bill) — omit it to resolve the tenant's current latest. */
export async function resolveLastElectricityReading(tenantId: string, beforeBillingMonth?: string): Promise<number> {
  let billedQuery = supabase
    .from('electricity_readings')
    .select('current_reading')
    .eq('tenant_id', tenantId)
    .eq('is_billed', true)
    .order('billing_month', { ascending: false })
    .limit(1)
  if (beforeBillingMonth) billedQuery = billedQuery.lt('billing_month', beforeBillingMonth)
  const { data: billedReading, error: brErr } = await billedQuery.maybeSingle()
  if (brErr) throw brErr
  if (billedReading) return billedReading.current_reading

  // Pre-migration-032 fallback below.
  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .select('electricity_start_reading')
    .eq('id', tenantId)
    .single()
  if (tErr) throw tErr
  const startReading = (tenant as { electricity_start_reading?: number }).electricity_start_reading ?? 0

  let billsQuery = supabase
    .from('bills')
    .select('billing_month, electricity_units, current_electricity_reading')
    .eq('tenant_id', tenantId)
    .order('billing_month', { ascending: true })
  if (beforeBillingMonth) billsQuery = billsQuery.lt('billing_month', beforeBillingMonth)
  const { data: bills, error: bErr } = await billsQuery
  if (bErr) throw bErr

  for (let i = (bills ?? []).length - 1; i >= 0; i--) {
    const reading = (bills![i] as { current_electricity_reading: number | null }).current_electricity_reading
    if (reading != null) return reading
  }

  let readingQuery = supabase
    .from('electricity_readings')
    .select('current_reading')
    .eq('tenant_id', tenantId)
    .order('billing_month', { ascending: false })
    .limit(1)
  if (beforeBillingMonth) readingQuery = readingQuery.lt('billing_month', beforeBillingMonth)
  const { data: reading } = await readingQuery.maybeSingle()
  if (reading) return reading.current_reading

  return (bills ?? []).reduce((total, b) => total + (b.electricity_units || 0), startReading)
}

export async function recordElectricityReading(input: {
  room_id: string
  tenant_id: string
  billing_month: string
  previous_reading: number
  current_reading: number
  rate_per_unit: number
  is_meter_reset?: boolean
  reset_explanation?: string
  /** Whether this reading is charged on this month's bill, or just
   * recorded and deferred to a later bill ("Skip / Carry Forward").
   * Defaults to true — the normal case. */
  is_billed?: boolean
}): Promise<ElectricityReading> {
  const { data, error } = await supabase
    .from('electricity_readings')
    .upsert(input, { onConflict: 'tenant_id,billing_month' })
    .select()
    .single()
  if (error) throw error
  return data as ElectricityReading
}
