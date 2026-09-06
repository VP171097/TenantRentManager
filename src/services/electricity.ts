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
