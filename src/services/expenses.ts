import { supabase } from '../lib/supabase'
import type { Expense } from '../types/database'

export async function listExpenses(filters?: { propertyId?: string }): Promise<Expense[]> {
  let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false })
  if (filters?.propertyId) query = query.eq('property_id', filters.propertyId)
  const { data, error } = await query
  if (error) throw error
  return data as Expense[]
}

export interface CreateExpenseResult {
  expense: Expense
  /** How many active tenants (in the targeted room/floor/property) actually
   * got the split charge added to a bill. */
  chargedCount: number
  /** How many were skipped because they have no bill yet to attach the
   * charge to — the owner needs to know this rather than have the charge
   * silently vanish. */
  skippedCount: number
}

export async function createExpense(input: {
  owner_id: string
  property_id: string
  floor?: string
  room_id?: string
  category: Expense['category']
  description?: string
  amount: number
  expense_date: string
  charge_to_tenant: boolean
  created_by?: string
}): Promise<CreateExpenseResult> {
  const { floor, ...expenseData } = input
  const { data, error } = await supabase.from('expenses').insert(expenseData).select().single()
  if (error) throw error
  const expense = data as Expense

  let chargedCount = 0
  let skippedCount = 0

  if (input.charge_to_tenant) {
    // 1. Find target rooms
    let roomQuery = supabase.from('rooms').select('id').eq('property_id', input.property_id).eq('status', 'occupied')
    if (input.room_id) roomQuery = roomQuery.eq('id', input.room_id)
    else if (input.floor) roomQuery = roomQuery.eq('floor', input.floor)

    const { data: targetRooms, error: roomsError } = await roomQuery
    if (roomsError) throw roomsError

    if (targetRooms && targetRooms.length > 0) {
      const roomIds = targetRooms.map((r) => r.id)

      // 2. Find active tenants in these rooms
      const { data: tenants, error: tenantsError } = await supabase.from('tenants').select('id').in('room_id', roomIds).eq('status', 'active')
      if (tenantsError) throw tenantsError

      if (tenants && tenants.length > 0) {
        const splitAmount = Number((input.amount / tenants.length).toFixed(2))

        // 3. Apply to latest bill for each tenant
        for (const t of tenants) {
          const { data: latestBill, error: billError } = await supabase
            .from('bills')
            .select('id, other_charges, late_fee, notes')
            .eq('tenant_id', t.id)
            .order('billing_month', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (billError) throw billError

          if (!latestBill) {
            // No bill exists yet for this tenant (e.g. the room was just
            // added and "Generate Bills" hasn't run for this month) —
            // there is nothing to attach the charge to. Surface this
            // rather than silently dropping it.
            skippedCount++
            continue
          }

          const newNotes = latestBill.notes
            ? `${latestBill.notes}\n+ ${input.category} expense: ${splitAmount}`
            : `+ ${input.category} expense: ${splitAmount}`

          const { error: chargeError } = await supabase.rpc('fn_update_bill_charges', {
            p_bill_id: latestBill.id,
            p_other_charges: latestBill.other_charges + splitAmount,
            p_late_fee: latestBill.late_fee,
            p_notes: newNotes,
          })
          if (chargeError) throw chargeError
          chargedCount++
        }
      }
    }
  }

  return { expense, chargedCount, skippedCount }
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
