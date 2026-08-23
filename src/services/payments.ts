import { supabase } from '../lib/supabase'
import type { Payment, Receipt } from '../types/database'

export async function listPayments(filters: { tenantId?: string; billId?: string } = {}): Promise<Payment[]> {
  let query = supabase.from('payments').select('*').order('payment_date', { ascending: false })
  if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId)
  if (filters.billId) query = query.eq('bill_id', filters.billId)
  const { data, error } = await query
  if (error) throw error
  return data as Payment[]
}

export async function recordPayment(input: {
  bill_id: string
  tenant_id: string
  amount: number
  payment_date: string
  method: Payment['method']
  reference?: string
  recorded_by?: string
}): Promise<Payment> {
  const { data, error } = await supabase.from('payments').insert(input).select().single()
  if (error) throw error
  return data as Payment
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw error
}

export async function generateReceipt(paymentId: string): Promise<Receipt> {
  const { data, error } = await supabase.rpc('fn_generate_receipt', { p_payment_id: paymentId })
  if (error) throw error
  return data as Receipt
}

export async function listReceipts(filters: { tenantId?: string; propertyId?: string } = {}): Promise<Receipt[]> {
  let query = supabase.from('receipts').select('*').order('generated_at', { ascending: false })
  if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId)
  if (filters.propertyId) query = query.eq('property_id', filters.propertyId)
  const { data, error } = await query
  if (error) throw error
  return data as Receipt[]
}
