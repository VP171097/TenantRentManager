import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProperty, updateProperty, deleteProperty } from '../services/properties'
import { listRooms, createRoom } from '../services/rooms'
import { listTenants } from '../services/tenants'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import { RoomCard, TenantCard } from '../components/Cards'
import { RoomForm } from '../components/forms/RoomForm'
import { PropertyForm } from '../components/forms/PropertyForm'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { friendlyError } from '../utils/errors'
import type { PropertyFormValues, RoomFormValues } from '../utils/validation'

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const { data: property, isLoading, error, refetch } = useQuery({
    queryKey: ['property', id],
    queryFn: () => getProperty(id!),
    enabled: !!id,
  })
  const { data: rooms } = useQuery({ queryKey: ['rooms', id], queryFn: () => listRooms(id), enabled: !!id })
  const { data: tenants } = useQuery({ queryKey: ['tenants', id], queryFn: () => listTenants(id), enabled: !!id })

  const createRoomMutation = useMutation({
    mutationFn: (values: RoomFormValues) => createRoom({ ...values, property_id: id! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', id] })
      setShowForm(false)
    },
    onError: (err) => setFormError(friendlyError(err)),
  })

  const editPropertyMutation = useMutation({
    mutationFn: (values: PropertyFormValues) => updateProperty(id!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', id] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      setShowEdit(false)
    },
    onError: (err) => setEditError(friendlyError(err)),
  })

  const deletePropertyMutation = useMutation({
    mutationFn: () => deleteProperty(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      navigate('/properties')
    },
    onError: (err) => setEditError(friendlyError(err)),
  })

  if (isLoading) return <LoadingState />
  if (error || !property) return <ErrorState message="Could not load property." onRetry={() => refetch()} />

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{property.name}</h1>
          <p className="text-slate-500">
            {property.code} {property.city && `· ${property.city}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowEdit((s) => !s)} className="btn-secondary px-4">
            {showEdit ? 'Close' : 'Edit'}
          </button>
          <button onClick={() => setShowDelete(true)} className="btn-secondary px-4 text-red-600">
            Delete Property
          </button>
        </div>
      </div>

      {editError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</p>}

      {showEdit && (
        <div className="card max-w-md">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Edit Property</h2>
          <PropertyForm
            defaultValues={{ name: property.name, code: property.code, address: property.address ?? '', city: property.city ?? '' }}
            onSubmit={(v) => editPropertyMutation.mutateAsync(v)}
            submitLabel="Save Changes"
          />
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Rooms</h2>
          <button onClick={() => setShowForm((s) => !s)} className="btn-primary px-4 py-2">
            {showForm ? 'Close' : '+ Add Room'}
          </button>
        </div>
        {showForm && (
          <div className="card mb-4 max-w-md">
            {formError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
            <RoomForm onSubmit={(v) => createRoomMutation.mutateAsync(v)} submitLabel="Add Room" />
          </div>
        )}
        {rooms && rooms.length === 0 && <EmptyState title="No rooms yet" description="Add rooms to this property." />}
        {rooms && rooms.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r) => (
              <RoomCard key={r.id} room={r} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Tenants</h2>
        {tenants && tenants.length === 0 && <EmptyState title="No tenants yet" />}
        {tenants && tenants.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.map((t) => (
              <TenantCard key={t.id} tenant={t} />
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={showDelete}
        title="Delete property"
        message="This will permanently delete this property and everything in it: all rooms, tenants, bills, and payment history. This cannot be undone."
        confirmLabel="Delete Property"
        danger
        onCancel={() => setShowDelete(false)}
        onConfirm={() => deletePropertyMutation.mutate()}
      />
    </div>
  )
}
