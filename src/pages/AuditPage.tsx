import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listAuditLogs, revertAuditLog } from '../services/audit'
import { listTenants } from '../services/tenants'
import { listProperties } from '../services/properties'
import { SkeletonList } from '../components/Skeleton'
import { ErrorState, EmptyState } from '../components/States'
import { friendlyError } from '../utils/errors'
import { Clock, RotateCcw, AlertTriangle } from 'lucide-react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { AuditLogEntry } from '../types/database'

export function AuditPage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [revertingLog, setRevertingLog] = useState<AuditLogEntry | null>(null)
  
  const { data: logs, isLoading, error: loadError, refetch } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: listAuditLogs
  })
  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: listTenants })
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: listProperties })

  const revertMutation = useMutation({
    mutationFn: (logId: string) => revertAuditLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
      setRevertingLog(null)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  if (isLoading) return <SkeletonList />
  if (loadError) return <ErrorState message="Could not load audit logs." onRetry={() => refetch()} />

  if (!logs || logs.length === 0) {
    return <EmptyState title="No activity recorded" description="Actions performed in your account will appear here." />
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
      case 'UPDATE': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
      case 'DELETE': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  const formatDataPreview = (data: any) => {
    if (!data) return ''
    try {
      const keys = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'owner_id')
      if (keys.length === 0) return 'No visible changes'
      return keys.map(k => `${k}: ${JSON.stringify(data[k])}`).join(', ').slice(0, 100) + '...'
    } catch {
      return '...'
    }
  }

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <Clock size={20} className="text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Audit Logs</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Review recent actions and revert if necessary.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="card space-y-0 p-0 overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {logs.map((log) => {
            const isRevertible = ['INSERT', 'DELETE', 'UPDATE'].includes(log.action)
            return (
              <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{log.table_name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(log.created_at).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-800 p-2 rounded max-w-2xl truncate">
                    {log.action === 'DELETE' || log.action === 'UPDATE' ? formatDataPreview(log.old_data) : formatDataPreview(log.new_data)}
                  </div>
                </div>
                {isRevertible && (
                  <button
                    onClick={() => setRevertingLog(log)}
                    className="shrink-0 btn-secondary px-3 py-1.5 text-xs gap-1.5"
                  >
                    <RotateCcw size={12} />
                    Revert
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <ConfirmDialog
        open={!!revertingLog}
        title="Revert Action"
        message={`Are you sure you want to revert this ${revertingLog?.action} on ${revertingLog?.table_name}? This action cannot be undone and will create a new log entry.`}
        confirmLabel={revertMutation.isPending ? "Reverting..." : "Yes, Revert"}
        danger
        onCancel={() => setRevertingLog(null)}
        onConfirm={() => revertingLog && revertMutation.mutate(revertingLog.id)}
      />
    </div>
  )
}
