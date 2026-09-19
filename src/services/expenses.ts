import { supabase } from '../lib/supabase'
import { currentBillingMonth } from '../utils/dashboard'
import { LIST_QUERY_LIMIT } from '../utils/query'
import type { Expense } from '../types/database'

export async function listExpenses(filters?: { propertyId?: string }): Promise<Expense[]> {
  let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false }).limit(LIST_QUERY_LIMIT)
  if (filters?.propertyId) query = query.eq('property_id', filters.propertyId)
  const { data, error } = await query
  if (error) throw error
  return data as Expense[]
}

export interface CreateExpenseResult {
  expense: Expense
  /** How many active tenants (in the targeted room/floor/property) had
   * the split charge applied to an existing current-month bill immediately. */
  chargedCount: number
  /** How many had no current-month bill yet — the charge is queued
   * (pending_tenant_charges) and will be folded in automatically the
   * next time a bill is generated for them, whenever that happens. */
  queuedCount: number
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
  let queuedCount = 0

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
        const billingMonth = `${currentBillingMonth()}-01`

        // 3. Queue the split charge for every tenant, then try to fold it
        // into their current-month bill immediately if one already
        // exists. If not, it stays queued — fn_generate_bill picks up
        // any still-unapplied charge automatically the next time a bill
        // is generated for that tenant, whenever that happens.
        for (const t of tenants) {
          const { error: queueError } = await supabase.from('pending_tenant_charges').insert({
            owner_id: input.owner_id,
            property_id: input.property_id,
            tenant_id: t.id,
            expense_id: expense.id,
            amount: splitAmount,
            description: `${input.category} expense`,
          })
          if (queueError) throw queueError

          const { data: appliedBill, error: applyError } = await supabase.rpc('fn_apply_pending_charges_now', {
            p_tenant_id: t.id,
            p_billing_month: billingMonth,
          })
          if (applyError) throw applyError

          if (appliedBill) chargedCount++
          else queuedCount++
        }
      }
    }
  }

  return { expense, chargedCount, queuedCount }
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
