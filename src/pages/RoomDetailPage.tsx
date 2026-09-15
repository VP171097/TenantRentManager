import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRoom, updateRoom, deleteRoom } from '../services/rooms'
import { listTenants, createTenant } from '../services/tenants'
import { useAuth } from '../hooks/useAuth'
import { ErrorState } from '../components/States'
import { SkeletonCardGrid } from '../components/Skeleton'
import { TenantCard } from '../components/Cards'
import { RoomForm } from '../components/forms/RoomForm'
import { TenantForm } from '../components/forms/TenantForm'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { friendlyError } from '../utils/errors'
import type { RoomFormValues, TenantFormValues } from '../utils/validation'

export function RoomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showAddTenant, setShowAddTenant] = useState(false)

  const { data: room, isLoading, error: loadError, refetch } = useQuery({
    queryKey: ['room', id],
    queryFn: () => getRoom(id!),
    enabled: !!id,
  })
  const { data: tenants } = useQuery({ queryKey: ['room-tenants', id], queryFn: () => listTenants(), enabled: !!id })

  const editMutation = useMutation({
    mutationFn: (values: RoomFormValues) => updateRoom(id!, { ...values, upi_id_id: values.upi_id_id || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', id] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setShowEdit(false)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const addTenantMutation = useMutation({
    mutationFn: (values: TenantFormValues) =>
      createTenant({
        owner_id: profile!.role === 'owner' ? profile!.id : profile!.owner_id!,
        property_id: values.property_id,
        room_id: values.room_id,
        full_name: values.full_name,
        phone: values.phone,
        email: values.email || undefined,
        avatar_url: values.avatar_url || undefined,
        move_in_date: values.move_in_date,
        security_deposit: values.security_deposit,
        initial_rent: values.initial_rent,
        electricity_start_reading: values.electricity_start_reading,
        electricity_rate: values.electricity_rate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-tenants', id] })
      queryClient.invalidateQueries({ queryKey: ['room', id] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setShowAddTenant(false)
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

  if (isLoading) return <SkeletonCardGrid count={2} />
  if (loadError || !room) return <ErrorState message="Could not load room." onRetry={() => refetch()} />

  const occupant = tenants?.find((t) => t.room_id === room.id && t.status === 'active')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Room {room.room_number}</h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">{room.status === 'occupied' ? 'Occupied' : 'Vacant'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {!occupant && (
            <button onClick={() => setShowAddTenant((s) => !s)} className="btn-primary px-4">
              {showAddTenant ? 'Close' : 'Add Tenant'}
            </button>
          )}
          <button onClick={() => setShowEdit((s) => !s)} className="btn-secondary px-4">
            {showEdit ? 'Close' : 'Edit'}
          </button>
          <button onClick={() => setShowDelete(true)} className="btn-secondary px-4 text-red-600 dark:text-red-400">
            Delete Room
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}

      {showEdit && (
        <div className="card max-w-sm">
          <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Edit Room</h2>
          <RoomForm
            defaultValues={{
              room_number: room.room_number,
              floor: room.floor ?? '',
              base_rent: room.base_rent,
              electricity_rate: room.electricity_rate,
              notes: room.notes ?? '',
              upi_id_id: room.upi_id_id ?? '',
            }}
            onSubmit={(v) => editMutation.mutateAsync(v)}
            submitLabel="Save Changes"
          />
        </div>
      )}

      {showAddTenant && !occupant && (
        <div className="card max-w-sm">
          <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Add Tenant to Room {room.room_number}</h2>
          <TenantForm
            defaultValues={{
              property_id: room.property_id,
              room_id: room.id,
              initial_rent: room.base_rent,
              electricity_rate: room.electricity_rate,
            }}
            onSubmit={(v) => addTenantMutation.mutateAsync(v)}
            submitLabel="Add Tenant"
          />
        </div>
      )}

      {occupant && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Current tenant</h2>
          <div className="max-w-sm">
            <TenantCard tenant={occupant} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete room"
        message={
          occupant
            ? `This will permanently delete this room AND ${occupant.full_name} (the current tenant) — including their bills, payments, and full history. This cannot be undone. Consider using 'Move Out' on the tenant instead if you just want to mark them inactive.`
            : 'This will permanently delete this room. This cannot be undone.'
        }
        confirmLabel="Delete Room"
        danger
        onCancel={() => setShowDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}
