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

/** Creates a bare manager record (name + email/phone, no login yet). The
 * owner then either sets a password directly (createManagerLogin) or
 * generates a shareable invite link (generateManagerInvite) so the
 * manager can set their own password. */
export async function createManager(input: {
  owner_id: string
  full_name: string
  email?: string | null
  phone?: string | null
}): Promise<Manager> {
  const { data, error } = await supabase.from('managers').insert(input).select().single()
  if (error) throw error
  return data as Manager
}

/** Owner generates (or regenerates) a shareable invite link for this
 * manager to self-register — same idea as generateTenantInvite. */
export async function generateManagerInvite(managerId: string): Promise<Manager> {
  const { data, error } = await supabase.rpc('fn_generate_manager_invite', { p_manager_id: managerId })
  if (error) throw error
  return data as Manager
}

export async function revokeManagerInvite(managerId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_revoke_manager_invite', { p_manager_id: managerId })
  if (error) throw error
}

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
  can_manage_expenses?: boolean
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
