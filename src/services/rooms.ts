import { supabase } from '../lib/supabase'
import type { Room } from '../types/database'

export async function listRooms(propertyId?: string): Promise<Room[]> {
  let query = supabase.from('rooms').select('*').order('room_number')
  if (propertyId) query = query.eq('property_id', propertyId)
  const { data, error } = await query
  if (error) throw error
  return data as Room[]
}

export async function getRoom(id: string): Promise<Room> {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', id).single()
  if (error) throw error
  return data as Room
}

export async function createRoom(input: {
  property_id: string
  room_number: string
  floor?: string
  base_rent: number
  notes?: string
}): Promise<Room> {
  const { data, error } = await supabase.from('rooms').insert(input).select().single()
  if (error) throw error
  return data as Room
}

export async function updateRoom(id: string, input: Partial<Room>): Promise<Room> {
  const { data, error } = await supabase.from('rooms').update(input).eq('id', id).select().single()
  if (error) throw error
  return data as Room
}

export async function deleteRoom(id: string): Promise<void> {
  const { error } = await supabase.from('rooms').delete().eq('id', id)
  if (error) throw error
}

/** Transfers a tenant to a new room, recording history and updating room
 * statuses (old room -> vacant, new room -> occupied). */
export async function transferTenantRoom(tenantId: string, fromRoomId: string | null, toRoomId: string, reason?: string): Promise<void> {
  const { error: histErr } = await supabase.from('tenant_room_history').insert({
    tenant_id: tenantId,
    from_room_id: fromRoomId,
    to_room_id: toRoomId,
    reason,
  })
  if (histErr) throw histErr

  const { error: tenantErr } = await supabase.from('tenants').update({ room_id: toRoomId }).eq('id', tenantId)
  if (tenantErr) throw tenantErr

  if (fromRoomId) {
    await supabase.from('rooms').update({ status: 'vacant' }).eq('id', fromRoomId)
  }
  await supabase.from('rooms').update({ status: 'occupied' }).eq('id', toRoomId)
}
