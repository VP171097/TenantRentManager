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
