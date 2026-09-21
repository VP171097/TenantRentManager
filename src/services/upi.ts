import { supabase } from '../lib/supabase'
import type { UpiId } from '../types/database'

export async function listUpiIds(ownerId: string): Promise<UpiId[]> {
  const { data, error } = await supabase.from('upi_ids').select('*').eq('owner_id', ownerId).order('label')
  if (error) throw error
  return data as UpiId[]
}

export async function addUpiId(ownerId: string, label: string, upiId: string): Promise<UpiId> {
  const { data, error } = await supabase
    .from('upi_ids')
    .insert({ owner_id: ownerId, label: label.trim(), upi_id: upiId.trim() })
    .select()
    .single()
  if (error) throw error
  return data as UpiId
}

export async function deleteUpiId(id: string): Promise<void> {
  const { error } = await supabase.from('upi_ids').delete().eq('id', id)
  if (error) throw error
}

/** Resolves which UPI ID a tenant's rent is actually paid to: their
 * room's own assigned UPI ID if one is set, otherwise the owner's main
 * UPI ID — same fallback rule used everywhere else (bill/receipt PDFs,
 * tenant dashboard). Returns null if neither is configured. */
export async function resolveUpiForTenant(tenantId: string): Promise<string | null> {
  const { data: tenant } = await supabase.from('tenants').select('room_id, owner_id').eq('id', tenantId).maybeSingle()
  if (!tenant) return null

  if (tenant.room_id) {
    const { data: room } = await supabase.from('rooms').select('upi_id_id').eq('id', tenant.room_id).maybeSingle()
    if (room?.upi_id_id) {
      const { data: upiRecord } = await supabase.from('upi_ids').select('upi_id').eq('id', room.upi_id_id).maybeSingle()
      if (upiRecord?.upi_id) return upiRecord.upi_id
    }
  }
  const { data: ownerProfile } = await supabase.from('profiles').select('upi_id').eq('id', tenant.owner_id).maybeSingle()
  return ownerProfile?.upi_id ?? null
}
