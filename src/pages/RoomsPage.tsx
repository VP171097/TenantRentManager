import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRoom, listRooms } from '../services/rooms'
import { listProperties } from '../services/properties'
import { RoomCard } from '../components/Cards'
import { RoomForm } from '../components/forms/RoomForm'
import { Modal } from '../components/Modal'
import { Field } from '../components/forms/PropertyForm'
import { ErrorState, EmptyState } from '../components/States'
import { SkeletonCardGrid } from '../components/Skeleton'
import { RoomEmptyIcon } from '../components/EmptyIcons'
import { useState } from 'react'
import { FilterBar } from '../components/SearchFilterBar'
import { Pagination } from '../components/Pagination'
import { usePagination } from '../hooks/usePagination'
import { friendlyError } from '../utils/errors'
import { Plus } from 'lucide-react'
import type { RoomFormValues } from '../utils/validation'

export function RoomsPage() {
  const queryClient = useQueryClient()
  const { data: rooms, isLoading, error, refetch } = useQuery({ queryKey: ['rooms'], queryFn: () => listRooms() })
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: listProperties })
  const [filter, setFilter] = useState<'all' | 'vacant' | 'occupied'>('all')
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [addRoomPropertyId, setAddRoomPropertyId] = useState('')
  const [addRoomError, setAddRoomError] = useState<string | null>(null)

  const createRoomMutation = useMutation({
    mutationFn: (values: RoomFormValues) =>
      createRoom({ ...values, property_id: addRoomPropertyId, upi_id_id: values.upi_id_id || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setShowAddRoom(false)
      setAddRoomPropertyId('')
      setAddRoomError(null)
    },
    onError: (err) => setAddRoomError(friendlyError(err)),
  })

  const filtered = (rooms ?? []).filter((r) => filter === 'all' || r.status === filter)
  const propertyNameFor = (id: string) => properties?.find((p) => p.id === id)?.name
  const { page, setPage, pageCount, pageItems, totalItems, pageSize } = usePagination(filtered, 24, filter)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Rooms</h1>
        <SkeletonCardGrid />
      </div>
    )
  }
  if (error) return <ErrorState message="Could not load rooms." onRetry={() => refetch()} />

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Rooms</h1>
        <button
          onClick={() => {
            setAddRoomPropertyId(properties?.[0]?.id ?? '')
            setAddRoomError(null)
            setShowAddRoom(true)
          }}
          disabled={!properties || properties.length === 0}
          className="btn-primary gap-1.5 px-4 disabled:opacity-50"
          title={!properties || properties.length === 0 ? 'Add a property first' : undefined}
        >
          <Plus size={16} /> Add Room
        </button>
      </div>
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
        <EmptyState title="No rooms found" icon={<RoomEmptyIcon className="h-full w-full" />} />
      ) : (
        <>
          <div className="stagger-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((r) => (
              <div key={r.id}>
                <p className="mb-1 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">{propertyNameFor(r.property_id)}</p>
                <RoomCard room={r} />
              </div>
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} totalItems={totalItems} pageSize={pageSize} onChange={setPage} />
        </>
      )}

      <Modal open={showAddRoom} title="Add Room" onClose={() => setShowAddRoom(false)}>
        <div className="space-y-4 p-5">
          <Field label="Property">
            <select value={addRoomPropertyId} onChange={(e) => setAddRoomPropertyId(e.target.value)} className="input">
              {properties?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          {addRoomError && <p className="text-sm text-red-600 dark:text-red-400">{addRoomError}</p>}
          <RoomForm
            defaultValues={{ electricity_rate: 0 }}
            onSubmit={(v) => createRoomMutation.mutateAsync(v)}
            submitLabel="Add Room"
          />
        </div>
      </Modal>
    </div>
  )
}
