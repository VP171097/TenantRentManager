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
import { friendlyError } from '../utils/errors'
import { formatINR } from '../utils/money'
import { downloadCsv, toCsv } from '../utils/csv'
import type { Expense } from '../types/database'
import type { ExpenseFormValues } from '../utils/validation'

export function ExpensesPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: expenses, isLoading, error, refetch } = useQuery({ queryKey: ['expenses'], queryFn: () => listExpenses() })
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: listProperties })

  const createMutation = useMutation({
    mutationFn: (values: ExpenseFormValues) =>
      createExpense({
        owner_id: profile!.role === 'owner' ? profile!.id : profile!.owner_id!,
        property_id: values.property_id,
        room_id: values.room_id || undefined,
        category: values.category,
        description: values.description || undefined,
        amount: values.amount,
        expense_date: values.expense_date,
        created_by: profile?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setShowForm(false)
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setEditing(null)
    },
    onError: (err) => setFormError(friendlyError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteExpense(deleting!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setDeleting(null)
    },
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
    const csv = toCsv(rows, [
      { key: 'property', label: 'Property' },
      { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount' },
      { key: 'expense_date', label: 'Date' },
    ])
    downloadCsv('expenses.csv', csv)
  }

  const total = (expenses ?? []).reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Expenses</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary px-4" disabled={!expenses || expenses.length === 0}>
            Export CSV
          </button>
          <button onClick={() => setShowForm((s) => !s)} className="btn-primary px-5">
            {showForm ? 'Close' : '+ Add Expense'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card max-w-md">
          {formError && <p className="mb-3 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{formError}</p>}
          <ExpenseForm onSubmit={(v) => createMutation.mutateAsync(v)} submitLabel="Add Expense" />
        </div>
      )}

      {editing && (
        <div className="card max-w-md">
          <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Edit Expense</h2>
          {formError && <p className="mb-3 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{formError}</p>}
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
          <button onClick={() => setEditing(null)} className="btn-secondary mt-3 w-full">
            Cancel
          </button>
        </div>
      )}

      {isLoading && <SkeletonList />}
      {error && <ErrorState message="Could not load expenses." onRetry={() => refetch()} />}
      {expenses && expenses.length === 0 && (
        <EmptyState title="No expenses recorded yet" description="Track maintenance, repairs, and other costs here." icon={<BillEmptyIcon className="h-full w-full" />} />
      )}
      {expenses && expenses.length > 0 && (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total: <span className="font-semibold text-slate-900 dark:text-slate-100">{formatINR(total)}</span>
          </p>
          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatINR(e.amount)} · <span className="capitalize">{e.category}</span>
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {propertyName(e.property_id)} · {new Date(e.expense_date).toLocaleDateString('en-IN')}
                    {e.description ? ` · ${e.description}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(e)} className="btn-secondary px-3">
                    Edit
                  </button>
                  <button onClick={() => setDeleting(e)} className="btn-secondary px-3 text-red-600 dark:text-red-400">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete expense"
        message="This will permanently delete this expense record. This cannot be undone."
        confirmLabel="Delete Expense"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}
