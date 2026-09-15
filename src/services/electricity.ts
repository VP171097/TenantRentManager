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
 * tenant's next bill — robust against a missing/mismatched
 * electricity_readings row, which happens for any bill generated with
 * "Skip / Carry Forward" checked (no electricity charged, so no reading
 * row is written for that month) as well as for bills predating
 * migration 028's snapshot columns.
 *
 * Walks backward through the tenant's bills for the most recent one that
 * actually has a reading snapshot — so a skipped month (electricity
 * units 0, no snapshot) is correctly skipped over and the last CHARGED
 * reading is carried forward instead, exactly matching the "August 0->250
 * paid, September skipped, October should start from 250" behavior.
 * Falls back to the electricity_readings join (older bills), then to
 * summing every bill's electricity_units forward from the tenant's start
 * reading, as a last resort that can never come back null.
 *
 * Pass `beforeBillingMonth` to resolve as of a specific month (e.g. when
 * defaulting the "Previous meter reading" field while editing a bill) —
 * omit it to resolve the tenant's current latest reading. */
export async function resolveLastElectricityReading(tenantId: string, beforeBillingMonth?: string): Promise<number> {
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
}): Promise<ElectricityReading> {
  const { data, error } = await supabase
    .from('electricity_readings')
    .upsert(input, { onConflict: 'tenant_id,billing_month' })
    .select()
    .single()
  if (error) throw error
  return data as ElectricityReading
}
