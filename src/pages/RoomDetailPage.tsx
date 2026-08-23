import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRoom, updateRoom } from '../services/rooms'
import { listTenants } from '../services/tenants'
import { LoadingState, ErrorState } from '../components/States'
import { TenantCard } from '../components/Cards'
import { friendlyError } from '../utils/errors'

export function RoomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { data: room, isLoading, error: loadError, refetch } = useQuery({
    queryKey: ['room', id],
    queryFn: () => getRoom(id!),
    enabled: !!id,
  })
  const { data: tenants } = useQuery({ queryKey: ['room-tenants', id], queryFn: () => listTenants(), enabled: !!id })

  const mutation = useMutation({
    mutationFn: (base_rent: number) => updateRoom(id!, { base_rent }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', id] }),
    onError: (err) => setError(friendlyError(err)),
  })

  if (isLoading) return <LoadingState />
  if (loadError || !room) return <ErrorState message="Could not load room." onRetry={() => refetch()} />

  const occupant = tenants?.find((t) => t.room_id === room.id && t.status === 'active')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Room {room.room_number}</h1>
        <p className="text-slate-500">{room.status === 'occupied' ? 'Occupied' : 'Vacant'}</p>
      </div>

      <div className="card max-w-sm space-y-3">
        <p className="text-sm font-semibold text-slate-700">Base rent (₹/month)</p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const value = Number(new FormData(e.currentTarget).get('base_rent'))
            if (value >= 0) mutation.mutate(value)
          }}
          className="flex gap-2"
        >
          <input type="number" name="base_rent" step="0.01" min="0" defaultValue={room.base_rent} className="input" />
          <button className="btn-primary px-4" disabled={mutation.isPending}>
            Save
          </button>
        </form>
      </div>

      {occupant && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Current tenant</h2>
          <div className="max-w-sm">
            <TenantCard tenant={occupant} />
          </div>
        </div>
      )}
    </div>
  )
}
