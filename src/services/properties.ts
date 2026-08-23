import { supabase } from '../lib/supabase'
import type { Property } from '../types/database'

export async function listProperties(): Promise<Property[]> {
  const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data as Property[]
}

export async function getProperty(id: string): Promise<Property> {
  const { data, error } = await supabase.from('properties').select('*').eq('id', id).single()
  if (error) throw error
  return data as Property
}

export async function createProperty(input: { name: string; code: string; address?: string; city?: string }, ownerId: string): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .insert({ ...input, owner_id: ownerId })
    .select()
    .single()
  if (error) throw error
  return data as Property
}

export async function updateProperty(id: string, input: Partial<Property>): Promise<Property> {
  const { data, error } = await supabase.from('properties').update(input).eq('id', id).select().single()
  if (error) throw error
  return data as Property
}

export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase.from('properties').delete().eq('id', id)
  if (error) throw error
}
