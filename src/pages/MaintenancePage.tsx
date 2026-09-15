import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listMaintenanceRequests, updateMaintenanceResolution } from '../services/maintenance'
import { listTenants } from '../services/tenants'
import { listProperties } from '../services/properties'
import { ErrorState, EmptyState } from '../components/States'
import { SkeletonList } from '../components/Skeleton'
import { friendlyError } from '../utils/errors'
import type { MaintenanceStatus, MaintenanceRequest } from '../types/database'
import { Wrench, CircleDot, Clock, CheckCircle2, AlertCircle, X, User, Phone, Image as ImageIcon } from 'lucide-react'
import { Modal } from '../components/Modal'
import { ImageUploader } from '../components/ImageUploader'

const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

const STATUS_CONFIG: Record<MaintenanceStatus, { bg: string; text: string; icon: React.ElementType }> = {
  open:        { bg: 'bg-red-100 dark:bg-red-900/40',    text: 'text-red-700 dark:text-red-400',    icon: AlertCircle },
  in_progress: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-400', icon: Clock },
  resolved:    { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
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
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolutionImages, setResolutionImages] = useState<string[]>([])

  const { data: requests, isLoading, error: loadError, refetch } = useQuery({
    queryKey: ['maintenance-requests'],
    queryFn: () => listMaintenanceRequests(),
  })
  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: () => listTenants() })
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: listProperties })

  const resolutionMutation = useMutation({
    mutationFn: (updates: { status?: MaintenanceStatus; resolution_notes?: string; resolution_images?: string[] }) =>
      updateMaintenanceResolution(selectedRequest!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
      setSelectedRequest(null)
      setResolutionNotes('')
      setResolutionImages([])
    },
    onError: (err) => setError(friendlyError(err)),
  })

  if (isLoading) return <SkeletonList />
  if (loadError) return <ErrorState message="Could not load maintenance requests." onRetry={() => refetch()} />

  const all = requests ?? []
  const counts = {
    open:        all.filter((r) => r.status === 'open').length,
    in_progress: all.filter((r) => r.status === 'in_progress').length,
    resolved:    all.filter((r) => r.status === 'resolved').length,
  }
  const filtered = all.filter((r) => filter === 'all' || r.status !== 'resolved')

  return (
    <div className="space-y-6 page-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
          <Wrench size={20} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Maintenance</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {counts.open} open · {counts.in_progress} in progress · {counts.resolved} resolved
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {([['open', 'Open', counts.open], ['all', 'All', all.length]] as [string, string, number][]).map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => setFilter(val as 'open' | 'all')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold border transition-all active:scale-95 ${
              filter === val
                ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-400'
            }`}
          >
            {label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filter === val ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No maintenance requests"
          description="Tenant-reported problems will show up here."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const tenant = tenants?.find((t) => t.id === r.tenant_id)
            const property = properties?.find((p) => p.id === r.property_id)
            const { bg, text, icon: StatusIcon } = STATUS_CONFIG[r.status]
            return (
              <div
                key={r.id}
                onClick={() => {
                  setSelectedRequest(r)
                  setResolutionNotes(r.resolution_notes ?? '')
                  setResolutionImages(r.resolution_images || [])
                }}
                className="card space-y-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                      <CircleDot size={15} className={text} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{r.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {tenant ? tenant.full_name : 'Unknown tenant'}
                        {property ? ` · ${property.name}` : ''} · {new Date(r.created_at).toLocaleDateString('en-IN')}
                      </p>
                      {r.description && (
                        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">{r.description}</p>
                      )}
                      {r.images && r.images.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          <ImageIcon size={14} className="text-slate-400" />
                          <span className="text-xs text-slate-500">{r.images.length} attachment(s)</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${bg} ${text}`}>
                    <StatusIcon size={11} />
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedRequest && (
        <Modal
          open={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title="Maintenance Details"
          className="max-w-lg"
        >
          {(() => {
            const r = selectedRequest
            const tenant = tenants?.find((t) => t.id === r.tenant_id)
            const property = properties?.find((p) => p.id === r.property_id)
            const { bg, text, icon: StatusIcon } = STATUS_CONFIG[r.status]
            const next = NEXT_STATUS[r.status]
            return (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${bg} ${text}`}>
                    <StatusIcon size={11} />
                    {STATUS_LABEL[r.status]}
                  </span>
                  <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{r.title}</h3>
                  {r.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{r.description}</p>}
                </div>

                {r.images && r.images.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Attached Images</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {r.images.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="Maintenance" className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {tenant && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Reporter Details</h4>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 shrink-0">
                        {tenant.avatar_url ? (
                          <img src={tenant.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-full w-full p-2 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <Link to={`/tenants/${tenant.id}`} className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                          {tenant.full_name}
                        </Link>
                        {tenant.phone && (
                          <p className="text-xs flex items-center gap-1 text-slate-500">
                            <Phone size={10} /> {tenant.phone}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-0.5">{property?.name}</p>
                      </div>
                    </div>
                  </div>
                )}

                <hr className="border-slate-200 dark:border-slate-800" />

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Resolution Details</h4>
                  <textarea
                    placeholder="Notes on how this is being/was resolved..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="input min-h-[80px]"
                  />
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">Resolution Photos</p>
                    {resolutionImages.length > 0 && (
                      <div className="mb-2 grid grid-cols-2 gap-2">
                        {resolutionImages.map((url, i) => (
                          <div key={i} className="relative">
                            <img src={url} alt="Resolution" className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                            <button
                              onClick={() => setResolutionImages((prev) => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-1 right-1 rounded-full bg-slate-900/50 p-1 text-white hover:bg-red-500 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <ImageUploader
                      path={`${r.tenant_id}/resolutions/${Date.now()}`}
                      bucket="maintenance-media"
                      label="Add resolution photo"
                      onUploaded={(url) => setResolutionImages((prev) => [...prev, url])}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => resolutionMutation.mutate({ resolution_notes: resolutionNotes, resolution_images: resolutionImages })}
                    disabled={resolutionMutation.isPending}
                    className="btn-secondary flex-1"
                  >
                    Save Details
                  </button>
                  {next && (
                    <button
                      onClick={() => resolutionMutation.mutate({ status: next, resolution_notes: resolutionNotes, resolution_images: resolutionImages })}
                      disabled={resolutionMutation.isPending}
                      className="btn-primary flex-1"
                    >
                      Mark as {STATUS_LABEL[next]}
                    </button>
                  )}
                </div>
              </div>
            )
          })()}
        </Modal>
      )}
    </div>
  )
}
