import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listProperties, createProperty } from '../services/properties'
import { useAuth } from '../hooks/useAuth'
import { PropertyCard } from '../components/Cards'
import { ErrorState, EmptyState } from '../components/States'
import { SkeletonCardGrid } from '../components/Skeleton'
import { PropertyEmptyIcon } from '../components/EmptyIcons'
import { PropertyForm } from '../components/forms/PropertyForm'
import { friendlyError } from '../utils/errors'
import { downloadCsv, toCsv } from '../utils/csv'
import type { PropertyFormValues } from '../utils/validation'

export function PropertiesPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['properties'], queryFn: listProperties })

  const createMutation = useMutation({
    mutationFn: (values: PropertyFormValues) => createProperty(values, profile!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      setShowForm(false)
    },
    onError: (err) => setFormError(friendlyError(err)),
  })

  function handleExport() {
    const rows = (data ?? []).map((p) => ({ name: p.name, code: p.code, address: p.address, city: p.city }))
    const csv = toCsv(rows, [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
    ])
    downloadCsv('properties.csv', csv)
  }

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Properties</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary px-4" disabled={!data || data.length === 0}>
            Export CSV
          </button>
          <button onClick={() => setShowForm((s) => !s)} className="btn-primary px-5">
            {showForm ? 'Close' : '+ Add Property'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card max-w-md">
          {formError && <p className="mb-3 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{formError}</p>}
          <PropertyForm onSubmit={(v) => createMutation.mutateAsync(v)} submitLabel="Create Property" />
        </div>
      )}

      {isLoading && <SkeletonCardGrid />}
      {error && <ErrorState message="Could not load properties." onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        <EmptyState
          title="No properties yet"
          description="Add your first property to get started."
          icon={<PropertyEmptyIcon className="h-full w-full" />}
        />
      )}
      {data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  )
}
