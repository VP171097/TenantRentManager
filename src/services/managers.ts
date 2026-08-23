import { supabase } from '../lib/supabase'
import type { Manager, ManagerPermission } from '../types/database'

export async function listManagers(): Promise<Manager[]> {
  const { data, error } = await supabase.from('managers').select('*').order('full_name')
  if (error) throw error
  return data as Manager[]
}

export async function listManagerPermissions(managerId: string): Promise<ManagerPermission[]> {
  const { data, error } = await supabase.from('manager_permissions').select('*').eq('manager_id', managerId)
  if (error) throw error
  return data as ManagerPermission[]
}

/** Invites a manager: creates the auth user via signUp (email/password chosen
 * by the owner during setup flow is out of scope for a static site — in
 * production this should go through a Supabase Edge Function using the
 * service role to invite by email; here we support attaching permissions
 * to an already-existing manager profile row created by such a flow). */
export async function upsertManagerPermission(input: {
  manager_id: string
  property_id: string
  can_view_tenants?: boolean
  can_edit_tenants?: boolean
  can_enter_electricity?: boolean
  can_record_payments?: boolean
  can_generate_receipts?: boolean
  can_view_ledger?: boolean
  can_edit_rent?: boolean
  can_manage_rooms?: boolean
}): Promise<ManagerPermission> {
  const { data, error } = await supabase
    .from('manager_permissions')
    .upsert(input, { onConflict: 'manager_id,property_id' })
    .select()
    .single()
  if (error) throw error
  return data as ManagerPermission
}

export async function updateManager(managerId: string, input: { full_name?: string; phone?: string }): Promise<Manager> {
  const { data, error } = await supabase.from('managers').update(input).eq('id', managerId).select().single()
  if (error) throw error
  return data as Manager
}

export async function removeManager(managerId: string): Promise<void> {
  const { error } = await supabase.from('managers').delete().eq('id', managerId)
  if (error) throw error
}
