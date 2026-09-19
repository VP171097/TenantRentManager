import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listExpenses, createExpense, updateExpense, deleteExpense } from '../services/expenses'
import { listProperties } from '../services/properties'
import { useAuth } from '../hooks/useAuth'
import { ErrorState, EmptyState } from '../components/States'
import { SkeletonList } from '../components/Skeleton'
import { BillEmptyIcon } from '../components/EmptyIcons'
import { ExpenseForm } from '../components/forms/ExpenseForm'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Modal } from '../components/Modal'
import { DashboardCard } from '../components/DashboardCard'
import { friendlyError } from '../utils/errors'
import { formatINR } from '../utils/money'
import { downloadCsv, toCsv } from '../utils/csv'
import { Pagination } from '../components/Pagination'
import { usePagination } from '../hooks/usePagination'
import type { Expense } from '../types/database'
import type { ExpenseFormValues } from '../utils/validation'
import { Wallet, Download, Plus, X, Pencil, Trash2, Tag } from 'lucide-react'

const CATEGORY_COLORS: Record<string, string> = {
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  utilities:   'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  repairs:     'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  salary:      'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  tax:         'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  insurance:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  other:       'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat.toLowerCase()] ?? CATEGORY_COLORS.other
}

export function ExpensesPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [chargeNotice, setChargeNotice] = useState<string | null>(null)

  const { data: expenses, isLoading, error, refetch } = useQuery({ queryKey: ['expenses'], queryFn: () => listExpenses() })
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: listProperties })

  const createMutation = useMutation({
    mutationFn: (values: ExpenseFormValues) =>
      createExpense({
        owner_id: profile!.role === 'owner' ? profile!.id : profile!.owner_id!,
        property_id: values.property_id,
        room_id: values.room_id || undefined,
        floor: values.floor || undefined,
        category: values.category,
        description: values.description || undefined,
        amount: values.amount,
        expense_date: values.expense_date,
        charge_to_tenant: values.charge_to_tenant ?? false,
        created_by: profile?.id,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      setShowForm(false)
      setFormError(null)
      if (result.queuedCount > 0 && result.chargedCount > 0) {
        setChargeNotice(
          `Expense saved. Charged ${result.chargedCount} tenant(s) immediately — ${result.queuedCount} queued because they don't have a bill yet; it'll be added automatically to their next generated bill.`
        )
      } else if (result.queuedCount > 0) {
        setChargeNotice(
          `Expense saved and queued for ${result.queuedCount} tenant(s) — they don't have a bill yet, so it'll be added automatically to their next generated bill.`
        )
      } else if (result.chargedCount > 0) {
        setChargeNotice(`Expense saved and charged to ${result.chargedCount} tenant(s).`)
      } else {
        setChargeNotice(null)
      }
    },
    onError: (err) => setFormError(friendlyError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (values: ExpenseFormValues) =>
      updateExpense(editing!.id, {
        property_id: values.property_id,
        room_id: values.room_id || null,
        category: values.category,
        description: values.description || null,
        amount: values.amount,
        expense_date: values.expense_date,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setEditing(null); setFormError(null) },
    onError: (err) => setFormError(friendlyError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteExpense(deleting!.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setDeleting(null) },
    onError: (err) => setFormError(friendlyError(err)),
  })

  function propertyName(id: string) {
    return properties?.find((p) => p.id === id)?.name ?? '—'
  }

  function handleExport() {
    const rows = (expenses ?? []).map((e) => ({
      property: propertyName(e.property_id),
      category: e.category,
      description: e.description ?? '',
      amount: e.amount,
      expense_date: e.expense_date,
    }))
    downloadCsv('expenses.csv', toCsv(rows, [
      { key: 'property', label: 'Property' },
      { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount' },
      { key: 'expense_date', label: 'Date' },
    ]))
  }

  const total = (expenses ?? []).reduce((s, e) => s + e.amount, 0)
  const { page, setPage, pageCount, pageItems, totalItems, pageSize } = usePagination(expenses ?? [], 20)

  return (
    <div className="space-y-6 page-fade-in">
      {chargeNotice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <span>{chargeNotice}</span>
          <button onClick={() => setChargeNotice(null)} className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400">
            <X size={15} />
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
            <Wallet size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Expenses</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary px-3 gap-1.5 text-sm" disabled={!expenses || expenses.length === 0}>
            <Download size={15} /> Export
          </button>
          <button
            onClick={() => { setShowForm((s) => !s); setEditing(null) }}
            className={`btn-primary px-4 gap-1.5 text-sm ${showForm ? 'bg-slate-600 hover:bg-slate-700' : ''}`}
          >
            {showForm ? <><X size={15} /> Close</> : <><Plus size={15} /> Add Expense</>}
          </button>
        </div>
      </div>

      {/* Total summary card */}
      {expenses && expenses.length > 0 && (
        <DashboardCard
          label="Total Expenses"
          value={formatINR(total)}
          tone="bad"
          countTo={total}
          format={formatINR}
          icon={<Wallet size={16} />}
        />
      )}

      {/* Add Form */}
      {showForm && (
        <div className="card max-w-lg slide-up">
          <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">Add New Expense</h2>
          {formError && (
            <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {formError}
            </div>
          )}
          <ExpenseForm onSubmit={(v) => createMutation.mutateAsync(v)} submitLabel="Add Expense" />
        </div>
      )}

      {/* Edit Form */}
      <Modal open={!!editing} title="Edit Expense" onClose={() => setEditing(null)}>
        {formError && (
          <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {formError}
          </div>
        )}
        {editing && (
          <ExpenseForm
            defaultValues={{
              property_id: editing.property_id,
              room_id: editing.room_id ?? '',
              category: editing.category,
              description: editing.description ?? '',
              amount: editing.amount,
              expense_date: editing.expense_date,
            }}
            onSubmit={(v) => updateMutation.mutateAsync(v)}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      {isLoading && <SkeletonList />}
      {error && <ErrorState message="Could not load expenses." onRetry={() => refetch()} />}
      {expenses && expenses.length === 0 && (
        <EmptyState
          title="No expenses recorded yet"
          description="Track maintenance, repairs, and other costs here."
          icon={<BillEmptyIcon className="h-full w-full" />}
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary px-5 text-sm">
              <Plus size={15} /> Add Expense
            </button>
          }
        />
      )}

      {expenses && expenses.length > 0 && (
        <>
        <div className="space-y-2">
          {pageItems.map((e) => (
            <div key={e.id} className="card flex items-center justify-between gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <Tag size={15} className="text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{formatINR(e.amount)}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${categoryColor(e.category)}`}>
                      {e.category}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {propertyName(e.property_id)} · {new Date(e.expense_date).toLocaleDateString('en-IN')}
                    {e.description ? ` · ${e.description}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => { setEditing(e); setShowForm(false) }} className="btn-secondary px-2.5 py-2 text-xs gap-1">
                  <Pencil size={12} />
                </button>
                <button onClick={() => setDeleting(e)} className="btn-secondary px-2.5 py-2 text-xs text-red-600 dark:text-red-400 hover:border-red-300 dark:hover:border-red-700">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <Pagination page={page} pageCount={pageCount} totalItems={totalItems} pageSize={pageSize} onChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete expense"
        message="This will permanently delete this expense record. This cannot be undone."
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}
