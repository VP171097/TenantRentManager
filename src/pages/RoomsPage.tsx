import { useQuery } from '@tanstack/react-query'
import { listRooms } from '../services/rooms'
import { listProperties } from '../services/properties'
import { RoomCard } from '../components/Cards'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import { useState } from 'react'
import { FilterBar } from '../components/SearchFilterBar'

export function RoomsPage() {
  const { data: rooms, isLoading, error, refetch } = useQuery({ queryKey: ['rooms'], queryFn: () => listRooms() })
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: listProperties })
  const [filter, setFilter] = useState<'all' | 'vacant' | 'occupied'>('all')

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message="Could not load rooms." onRetry={() => refetch()} />

  const filtered = (rooms ?? []).filter((r) => filter === 'all' || r.status === filter)
  const propertyNameFor = (id: string) => properties?.find((p) => p.id === id)?.name

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Rooms</h1>
      <FilterBar
        options={[
          { value: 'all', label: 'All' },
          { value: 'vacant', label: 'Vacant' },
          { value: 'occupied', label: 'Occupied' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {filtered.length === 0 ? (
        <EmptyState title="No rooms found" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <div key={r.id}>
              <p className="mb-1 text-xs font-semibold uppercase text-slate-400">{propertyNameFor(r.property_id)}</p>
              <RoomCard room={r} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
