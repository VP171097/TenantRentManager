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
