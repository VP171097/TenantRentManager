import { supabase } from '../lib/supabase'
import type { MaintenanceRequest, MaintenanceStatus } from '../types/database'

export async function listMaintenanceRequests(filters?: { propertyId?: string; tenantId?: string }): Promise<MaintenanceRequest[]> {
  let query = supabase.from('maintenance_requests').select('*').order('created_at', { ascending: false })
  if (filters?.propertyId) query = query.eq('property_id', filters.propertyId)
  if (filters?.tenantId) query = query.eq('tenant_id', filters.tenantId)
  const { data, error } = await query
  if (error) throw error
  return data as MaintenanceRequest[]
}

export async function createMaintenanceRequest(input: {
  tenant_id: string
  property_id: string
  room_id?: string | null
  title: string
  description?: string
}): Promise<MaintenanceRequest> {
  const { data, error } = await supabase.from('maintenance_requests').insert(input).select().single()
  if (error) throw error
  return data as MaintenanceRequest
}

export async function updateMaintenanceStatus(id: string, status: MaintenanceStatus): Promise<MaintenanceRequest> {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as MaintenanceRequest
}
