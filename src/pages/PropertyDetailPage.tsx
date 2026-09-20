import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProperty, updateProperty, deleteProperty } from '../services/properties'
import { listRooms, createRoom } from '../services/rooms'
import { listTenants } from '../services/tenants'
import { ErrorState, EmptyState } from '../components/States'
import { SkeletonCardGrid } from '../components/Skeleton'
import { RoomEmptyIcon, TenantEmptyIcon } from '../components/EmptyIcons'
import { RoomCard, TenantCard } from '../components/Cards'
import { RoomForm } from '../components/forms/RoomForm'
import { PropertyForm } from '../components/forms/PropertyForm'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Modal } from '../components/Modal'
import { ImageUploader } from '../components/ImageUploader'
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
    mutationFn: (values: RoomFormValues) => createRoom({ ...values, property_id: id!, upi_id_id: values.upi_id_id || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', id] })
      setShowForm(false)
    },
    onError: (err) => setFormError(friendlyError(err)),
  })

  const coverMutation = useMutation({
    mutationFn: (coverUrl: string) => updateProperty(id!, { cover_image_url: coverUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', id] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
    onError: (err) => setEditError(friendlyError(err)),
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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <SkeletonCardGrid count={1} />
        <SkeletonCardGrid />
      </div>
    )
  }
  if (error || !property) return <ErrorState message="Could not load property." onRetry={() => refetch()} />

  return (
    <div className="space-y-8 page-fade-in">
      {property.cover_image_url && (
        <div className="h-40 w-full overflow-hidden rounded-2xl sm:h-56">
          <img src={property.cover_image_url} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{property.name}</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {property.code} {property.city && `· ${property.city}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowEdit(true)} className="btn-secondary px-4">
            Edit
          </button>
          <button onClick={() => setShowDelete(true)} className="btn-secondary px-4 text-red-600 dark:text-red-400">
            Delete Property
          </button>
        </div>
      </div>

      {editError && <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{editError}</p>}

      <Modal open={showEdit} title="Edit Property" onClose={() => setShowEdit(false)}>
        <div className="space-y-5">
          <PropertyForm
            defaultValues={{ name: property.name, code: property.code, address: property.address ?? '', city: property.city ?? '' }}
            onSubmit={(v) => editPropertyMutation.mutateAsync(v)}
            submitLabel="Save Changes"
          />
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Cover photo</label>
            <div className="mt-1">
              <ImageUploader
                path={`${property.owner_id}/cover-${property.id}`}
                label={property.cover_image_url ? 'Change cover photo' : 'Upload cover photo'}
                currentUrl={property.cover_image_url}
                onUploaded={(url) => coverMutation.mutate(url)}
              />
            </div>
          </div>
        </div>
      </Modal>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Rooms</h2>
          <button onClick={() => setShowForm((s) => !s)} className="btn-primary px-4 py-2">
            {showForm ? 'Close' : '+ Add Room'}
          </button>
        </div>
        {showForm && (
          <div className="card mb-4 max-w-md">
            {formError && <p className="mb-3 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{formError}</p>}
            <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">Add New Room</h2>
            <RoomForm defaultValues={{ electricity_rate: 0 }} onSubmit={(v) => createRoomMutation.mutateAsync(v)} submitLabel="Add Room" />
          </div>
        )}
        {rooms && rooms.length === 0 && (
          <EmptyState title="No rooms yet" description="Add rooms to this property." icon={<RoomEmptyIcon className="h-full w-full" />} />
        )}
        {rooms && rooms.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r) => (
              <RoomCard key={r.id} room={r} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Tenants</h2>
        {tenants && tenants.length === 0 && <EmptyState title="No tenants yet" icon={<TenantEmptyIcon className="h-full w-full" />} />}
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
        pending={deletePropertyMutation.isPending}
        onCancel={() => setShowDelete(false)}
        onConfirm={() => deletePropertyMutation.mutate()}
      />
    </div>
  )
}
