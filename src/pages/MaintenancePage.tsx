import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listMaintenanceRequests, updateMaintenanceStatus } from '../services/maintenance'
import { listTenants } from '../services/tenants'
import { listProperties } from '../services/properties'
import { ErrorState, EmptyState } from '../components/States'
import { SkeletonList } from '../components/Skeleton'
import { friendlyError } from '../utils/errors'
import type { MaintenanceStatus } from '../types/database'

const STATUS_LABEL: Record<MaintenanceStatus, string> = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved' }
const STATUS_TONE: Record<MaintenanceStatus, string> = {
  open: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400',
  in_progress: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400',
  resolved: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400',
}
const NEXT_STATUS: Record<MaintenanceStatus, MaintenanceStatus | null> = {
  open: 'in_progress',
  in_progress: 'resolved',
  resolved: null,
}

export function MaintenancePage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'all'>('open')

  const { data: requests, isLoading, error: loadError, refetch } = useQuery({
    queryKey: ['maintenance-requests'],
    queryFn: () => listMaintenanceRequests(),
  })
  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: () => listTenants() })
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: listProperties })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MaintenanceStatus }) => updateMaintenanceStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] }),
    onError: (err) => setError(friendlyError(err)),
  })

  if (isLoading) return <SkeletonList />
  if (loadError) return <ErrorState message="Could not load maintenance requests." onRetry={() => refetch()} />

  const filtered = (requests ?? []).filter((r) => filter === 'all' || r.status !== 'resolved')

  return (
    <div className="space-y-6 page-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Maintenance Requests</h1>
      {error && <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}

      <div className="flex gap-2 text-xs font-semibold">
        <button
          onClick={() => setFilter('open')}
          className={`rounded-lg px-3 py-1.5 ${filter === 'open' ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          Open
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-3 py-1.5 ${filter === 'all' ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          All
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No maintenance requests" description="Tenant-reported problems will show up here." />
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const tenant = tenants?.find((t) => t.id === r.tenant_id)
            const property = properties?.find((p) => p.id === r.property_id)
            const next = NEXT_STATUS[r.status]
            return (
              <div key={r.id} className="card space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{r.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {tenant ? (
                        <Link to={`/tenants/${tenant.id}`} className="underline">
                          {tenant.full_name}
                        </Link>
                      ) : (
                        'Unknown tenant'
                      )}
                      {property ? ` · ${property.name}` : ''} · {new Date(r.created_at).toLocaleDateString('en-IN')}
                    </p>
                    {r.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.description}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_TONE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                {next && (
                  <button
                    onClick={() => statusMutation.mutate({ id: r.id, status: next })}
                    disabled={statusMutation.isPending}
                    className="btn-secondary px-4"
                  >
                    Mark as {STATUS_LABEL[next]}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
