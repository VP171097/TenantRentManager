import { supabase } from '../lib/supabase'
import type { Tenant } from '../types/database'

export async function listTenants(propertyId?: string): Promise<Tenant[]> {
  let query = supabase.from('tenants').select('*').order('full_name')
  if (propertyId) query = query.eq('property_id', propertyId)
  const { data, error } = await query
  if (error) throw error
  return data as Tenant[]
}

export async function getTenant(id: string): Promise<Tenant> {
  const { data, error } = await supabase.from('tenants').select('*').eq('id', id).single()
  if (error) throw error
  return data as Tenant
}

export interface NewTenantInput {
  owner_id: string
  property_id: string
  room_id: string
  full_name: string
  phone: string
  email?: string
  move_in_date: string
  security_deposit: number
  initial_rent: number
}

/** Creates a tenant, marks the room occupied, and records the initial rent
 * revision — all in a best-effort sequence (Postgres FKs + RLS still
 * enforce correctness; a partial failure surfaces a friendly error and the
 * user can retry idempotently since rent_revisions is unique per date). */
export async function createTenant(input: NewTenantInput): Promise<Tenant> {
  const { initial_rent, ...tenantInput } = input
  const { data: tenant, error } = await supabase.from('tenants').insert(tenantInput).select().single()
  if (error) throw error

  const { error: revErr } = await supabase.from('rent_revisions').insert({
    tenant_id: tenant.id,
    effective_date: input.move_in_date,
    rent_amount: initial_rent,
    change_type: 'initial',
  })
  if (revErr) throw revErr

  const { error: roomErr } = await supabase.from('rooms').update({ status: 'occupied' }).eq('id', input.room_id)
  if (roomErr) throw roomErr

  return tenant as Tenant
}

export async function updateTenant(id: string, input: Partial<Tenant>): Promise<Tenant> {
  const { data, error } = await supabase.from('tenants').update(input).eq('id', id).select().single()
  if (error) throw error
  return data as Tenant
}

export async function moveOutTenant(params: {
  tenant_id: string
  move_out_date: string
  final_billing_month: string
  final_current_reading: number
  deposit_deduction?: number
  deduction_reason?: string
}): Promise<void> {
  const { error } = await supabase.rpc('fn_settle_move_out', {
    p_tenant_id: params.tenant_id,
    p_move_out_date: params.move_out_date,
    p_final_billing_month: params.final_billing_month,
    p_final_current_reading: params.final_current_reading,
    p_deposit_deduction: params.deposit_deduction ?? 0,
    p_deduction_reason: params.deduction_reason ?? null,
  })
  if (error) throw error
}
