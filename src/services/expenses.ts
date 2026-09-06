import { supabase } from '../lib/supabase'
import type { Expense } from '../types/database'

export async function listExpenses(filters?: { propertyId?: string }): Promise<Expense[]> {
  let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false })
  if (filters?.propertyId) query = query.eq('property_id', filters.propertyId)
  const { data, error } = await query
  if (error) throw error
  return data as Expense[]
}

export async function createExpense(input: {
  owner_id: string
  property_id: string
  room_id?: string
  category: Expense['category']
  description?: string
  amount: number
  expense_date: string
  created_by?: string
}): Promise<Expense> {
  const { data, error } = await supabase.from('expenses').insert(input).select().single()
  if (error) throw error
  return data as Expense
}

export async function updateExpense(id: string, input: Partial<Expense>): Promise<Expense> {
  const { data, error } = await supabase.from('expenses').update(input).eq('id', id).select().single()
  if (error) throw error
  return data as Expense
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}
