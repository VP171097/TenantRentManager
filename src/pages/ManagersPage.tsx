import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listManagers, listManagerPermissions, upsertManagerPermission, removeManager } from '../services/managers'
import { listProperties } from '../services/properties'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { friendlyError } from '../utils/errors'

const PERMISSION_FIELDS: { key: string; label: string }[] = [
  { key: 'can_view_tenants', label: 'View tenants' },
  { key: 'can_edit_tenants', label: 'Add/edit tenants' },
  { key: 'can_enter_electricity', label: 'Enter electricity readings' },
  { key: 'can_record_payments', label: 'Record payments' },
  { key: 'can_generate_receipts', label: 'Generate receipts' },
  { key: 'can_view_ledger', label: 'View ledger' },
  { key: 'can_edit_rent', label: 'Edit rent' },
  { key: 'can_manage_rooms', label: 'Manage rooms' },
]

export function ManagersPage() {
  const queryClient = useQueryClient()
  const { data: managers, isLoading, error, refetch } = useQuery({ queryKey: ['managers'], queryFn: listManagers })
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: listProperties })
  const [expandedManagerId, setExpandedManagerId] = useState<string | null>(null)
  const [toRemove, setToRemove] = useState<string | null>(null)

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeManager(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] })
      setToRemove(null)
    },
  })

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message="Could not load managers." onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Managers</h1>
      <p className="text-slate-500">
        Managers sign up separately using the standard login screen with the "manager" role assigned by you, or via
        an invite flow set up by your admin. Once a manager account exists, set what they can access here.
      </p>

      {managers && managers.length === 0 && <EmptyState title="No managers added yet" />}
      <div className="space-y-3">
        {managers?.map((m) => (
          <div key={m.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{m.full_name}</p>
                <p className="text-sm text-slate-500">{m.email}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setExpandedManagerId(expandedManagerId === m.id ? null : m.id)}
                  className="btn-secondary px-4"
                >
                  Permissions
                </button>
                <button onClick={() => setToRemove(m.id)} className="btn-secondary px-4 text-red-600">
                  Remove
                </button>
              </div>
            </div>
            {expandedManagerId === m.id && properties && (
              <ManagerPermissionsEditor managerId={m.id} properties={properties} />
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!toRemove}
        title="Remove manager"
        message="This manager will lose access to all properties. This cannot be undone."
        confirmLabel="Remove"
        danger
        onCancel={() => setToRemove(null)}
        onConfirm={() => toRemove && removeMutation.mutate(toRemove)}
      />
    </div>
  )
}

function ManagerPermissionsEditor({ managerId, properties }: { managerId: string; properties: { id: string; name: string }[] }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const { data: perms } = useQuery({ queryKey: ['manager-permissions', managerId], queryFn: () => listManagerPermissions(managerId) })

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof upsertManagerPermission>[0]) => upsertManagerPermission(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manager-permissions', managerId] }),
    onError: (err) => setError(friendlyError(err)),
  })

  return (
    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {properties.map((p) => {
        const perm = perms?.find((x) => x.property_id === p.id)
        return (
          <div key={p.id}>
            <p className="mb-2 font-semibold text-slate-800">{p.name}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PERMISSION_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={Boolean(perm?.[f.key as keyof typeof perm])}
                    onChange={(e) =>
                      mutation.mutate({
                        manager_id: managerId,
                        property_id: p.id,
                        [f.key]: e.target.checked,
                      })
                    }
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
