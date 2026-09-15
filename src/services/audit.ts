import { supabase } from '../lib/supabase'
import type { AuditLogEntry } from '../types/database'

export async function listAuditLogs(): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data as AuditLogEntry[]
}

export async function revertAuditLog(logId: string): Promise<void> {
  const { data: log, error: fetchError } = await supabase.from('audit_logs').select('*').eq('id', logId).single()
  if (fetchError || !log) throw fetchError || new Error('Log not found')

  const tableName = log.table_name
  const action = log.action

  if (action === 'INSERT') {
    // Revert INSERT means DELETE
    const { error } = await supabase.from(tableName).delete().eq('id', log.record_id)
    if (error) throw error
  } else if (action === 'DELETE') {
    // Revert DELETE means INSERT old_data
    if (!log.old_data) throw new Error('No old data to restore')
    const { error } = await supabase.from(tableName).insert(log.old_data)
    if (error) throw error
  } else if (action === 'UPDATE') {
    // Revert UPDATE means UPDATE to old_data
    if (!log.old_data) throw new Error('No old data to restore')
    const { error } = await supabase.from(tableName).update(log.old_data).eq('id', log.record_id)
    if (error) throw error
  }

  // Optional: We can delete the log or just leave it. Let's leave it.
}
