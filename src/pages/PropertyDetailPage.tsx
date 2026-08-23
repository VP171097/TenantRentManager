import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProperty } from '../services/properties'
import { listRooms, createRoom } from '../services/rooms'
import { listTenants } from '../services/tenants'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import { RoomCard, TenantCard } from '../components/Cards'
import { RoomForm } from '../components/forms/RoomForm'
import { friendlyError } from '../utils/errors'
import type { RoomFormValues } from '../utils/validation'

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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

  if (isLoading) return <LoadingState />
  if (error || !property) return <ErrorState message="Could not load property." onRetry={() => refetch()} />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{property.name}</h1>
        <p className="text-slate-500">
          {property.code} {property.city && `· ${property.city}`}
        </p>
      </div>

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
    </div>
  )
}
