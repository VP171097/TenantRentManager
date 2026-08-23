import { supabase } from '../lib/supabase'
import type { AuditLogEntry } from '../types/database'

export async function logAction(input: {
  owner_id: string
  actor_id: string
  action: string
  entity_type: string
  entity_id?: string
  details?: Record<string, unknown>
}): Promise<void> {
  const { error } = await supabase.from('audit_log').insert(input)
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to write audit log entry', error)
  }
}

export async function listAuditLog(ownerId: string, limit = 100): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as AuditLogEntry[]
}
