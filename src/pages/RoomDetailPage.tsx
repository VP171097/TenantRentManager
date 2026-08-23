import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRoom, updateRoom, deleteRoom } from '../services/rooms'
import { listTenants } from '../services/tenants'
import { LoadingState, ErrorState } from '../components/States'
import { TenantCard } from '../components/Cards'
import { RoomForm } from '../components/forms/RoomForm'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { friendlyError } from '../utils/errors'
import type { RoomFormValues } from '../utils/validation'

export function RoomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const { data: room, isLoading, error: loadError, refetch } = useQuery({
    queryKey: ['room', id],
    queryFn: () => getRoom(id!),
    enabled: !!id,
  })
  const { data: tenants } = useQuery({ queryKey: ['room-tenants', id], queryFn: () => listTenants(), enabled: !!id })

  const editMutation = useMutation({
    mutationFn: (values: RoomFormValues) => updateRoom(id!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', id] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setShowEdit(false)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteRoom(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      navigate(room ? `/properties/${room.property_id}` : '/rooms')
    },
    onError: (err) => setError(friendlyError(err)),
  })

  if (isLoading) return <LoadingState />
  if (loadError || !room) return <ErrorState message="Could not load room." onRetry={() => refetch()} />

  const occupant = tenants?.find((t) => t.room_id === room.id && t.status === 'active')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Room {room.room_number}</h1>
          <p className="text-slate-500">{room.status === 'occupied' ? 'Occupied' : 'Vacant'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowEdit((s) => !s)} className="btn-secondary px-4">
            {showEdit ? 'Close' : 'Edit'}
          </button>
          <button onClick={() => setShowDelete(true)} className="btn-secondary px-4 text-red-600">
            Delete Room
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {showEdit && (
        <div className="card max-w-sm">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Edit Room</h2>
          <RoomForm
            defaultValues={{
              room_number: room.room_number,
              floor: room.floor ?? '',
              base_rent: room.base_rent,
              notes: room.notes ?? '',
            }}
            onSubmit={(v) => editMutation.mutateAsync(v)}
            submitLabel="Save Changes"
          />
        </div>
      )}

      {occupant && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Current tenant</h2>
          <div className="max-w-sm">
            <TenantCard tenant={occupant} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete room"
        message="This will permanently delete this room. If a tenant is currently assigned to it, deletion will be blocked until they are moved to another room or moved out."
        confirmLabel="Delete Room"
        danger
        onCancel={() => setShowDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}
