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
import { Pagination } from '../components/Pagination'
import { usePagination } from '../hooks/usePagination'
import { friendlyError } from '../utils/errors'
import { downloadCsv, toCsv } from '../utils/csv'
import type { TenantFormValues } from '../utils/validation'
import { Users, Download, X, Plus } from 'lucide-react'

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
        avatar_url: values.avatar_url || undefined,
        move_in_date: values.move_in_date,
        security_deposit: values.security_deposit,
        initial_rent: values.initial_rent,
        electricity_start_reading: values.electricity_start_reading,
        electricity_rate: values.electricity_rate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setShowForm(false)
      setFormError(null)
    },
    onError: (err) => setFormError(friendlyError(err)),
  })

  const filtered = useMemo(() => {
    return (data ?? [])
      .filter((t) => filter === 'all' || t.status === filter)
      .filter((t) => !search || t.full_name.toLowerCase().includes(search.toLowerCase()) || (t.phone ?? '').includes(search))
  }, [data, filter, search])

  const { page, setPage, pageCount, pageItems, totalItems, pageSize } = usePagination(filtered, 24, `${filter}|${search}`)

  // Counts per filter for badges
  const counts = useMemo(() => ({
    active:    (data ?? []).filter((t) => t.status === 'active').length,
    moved_out: (data ?? []).filter((t) => t.status === 'moved_out').length,
    all:       (data ?? []).length,
  }), [data])

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
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <Users size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Tenants</h1>
            {data && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{counts.active} active · {counts.all} total</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary px-3 gap-1.5 text-sm" disabled={filtered.length === 0}>
            <Download size={15} /> Export
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className={`btn-primary px-4 gap-1.5 text-sm ${showForm ? 'bg-slate-600 hover:bg-slate-700' : ''}`}
          >
            {showForm ? <><X size={15} /> Close</> : <><Plus size={15} /> Add Tenant</>}
          </button>
        </div>
      </div>

      {/* Add Tenant Form */}
      {showForm && (
        <div className="card max-w-lg slide-up">
          <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">Add New Tenant</h2>
          {formError && (
            <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {formError}
            </div>
          )}
          <TenantForm onSubmit={(v) => createMutation.mutateAsync(v)} submitLabel="Add Tenant" />
        </div>
      )}

      {/* Search + Filter */}
      <SearchBar value={search} onChange={setSearch} placeholder="Search by name or mobile…" />
      <FilterBar
        options={[
          { value: 'active', label: 'Active', count: counts.active },
          { value: 'moved_out', label: 'Moved Out', count: counts.moved_out },
          { value: 'all', label: 'All', count: counts.all },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {isLoading && <SkeletonCardGrid />}
      {error && <ErrorState message="Could not load tenants." onRetry={() => refetch()} />}
      {filtered.length === 0 && !isLoading && (
        <EmptyState
          title="No tenants found"
          description={search ? `No results for "${search}"` : 'Add your first tenant to get started.'}
          icon={<TenantEmptyIcon className="h-full w-full" />}
          action={
            !showForm ? (
              <button onClick={() => setShowForm(true)} className="btn-primary px-5 text-sm">
                <Plus size={15} /> Add Tenant
              </button>
            ) : undefined
          }
        />
      )}
      {filtered.length > 0 && (
        <>
          <div className="stagger-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((t) => (
              <TenantCard key={t.id} tenant={t} />
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} totalItems={totalItems} pageSize={pageSize} onChange={setPage} />
        </>
      )}
    </div>
  )
}
