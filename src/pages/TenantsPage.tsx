import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listTenants, createTenant } from '../services/tenants'
import { useAuth } from '../hooks/useAuth'
import { TenantCard } from '../components/Cards'
import { ErrorState, EmptyState } from '../components/States'
import { SkeletonCardGrid } from '../components/Skeleton'
import { TenantEmptyIcon } from '../components/EmptyIcons'
import { TenantForm } from '../components/forms/TenantForm'
import { SearchBar, FilterBar } from '../components/SearchFilterBar'
import { friendlyError } from '../utils/errors'
import { downloadCsv, toCsv } from '../utils/csv'
import type { TenantFormValues } from '../utils/validation'

export function TenantsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'moved_out'>('active')

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['tenants'], queryFn: () => listTenants() })

  const createMutation = useMutation({
    mutationFn: (values: TenantFormValues) =>
      createTenant({
        owner_id: profile!.role === 'owner' ? profile!.id : profile!.owner_id!,
        property_id: values.property_id,
        room_id: values.room_id,
        full_name: values.full_name,
        phone: values.phone,
        email: values.email || undefined,
        move_in_date: values.move_in_date,
        security_deposit: values.security_deposit,
        initial_rent: values.initial_rent,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setShowForm(false)
    },
    onError: (err) => setFormError(friendlyError(err)),
  })

  const filtered = useMemo(() => {
    return (data ?? [])
      .filter((t) => filter === 'all' || t.status === filter)
      .filter((t) => !search || t.full_name.toLowerCase().includes(search.toLowerCase()) || (t.phone ?? '').includes(search))
  }, [data, filter, search])

  function handleExport() {
    const rows = filtered.map((t) => ({
      full_name: t.full_name,
      phone: t.phone,
      email: t.email,
      status: t.status,
      move_in_date: t.move_in_date,
      security_deposit: t.security_deposit,
    }))
    const csv = toCsv(rows, [
      { key: 'full_name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'status', label: 'Status' },
      { key: 'move_in_date', label: 'Move-in Date' },
      { key: 'security_deposit', label: 'Security Deposit' },
    ])
    downloadCsv('tenants.csv', csv)
  }

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Tenants</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary px-4" disabled={filtered.length === 0}>
            Export CSV
          </button>
          <button onClick={() => setShowForm((s) => !s)} className="btn-primary px-5">
            {showForm ? 'Close' : '+ Add Tenant'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card max-w-md">
          {formError && <p className="mb-3 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{formError}</p>}
          <TenantForm onSubmit={(v) => createMutation.mutateAsync(v)} submitLabel="Add Tenant" />
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name or mobile…" />
      <FilterBar
        options={[
          { value: 'active', label: 'Active' },
          { value: 'moved_out', label: 'Moved Out' },
          { value: 'all', label: 'All' },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {isLoading && <SkeletonCardGrid />}
      {error && <ErrorState message="Could not load tenants." onRetry={() => refetch()} />}
      {filtered.length === 0 && !isLoading && <EmptyState title="No tenants found" icon={<TenantEmptyIcon className="h-full w-full" />} />}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TenantCard key={t.id} tenant={t} />
          ))}
        </div>
      )}
    </div>
  )
}
