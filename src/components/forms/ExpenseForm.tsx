import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { expenseSchema, type ExpenseFormValues } from '../../utils/validation'
import { Field } from './PropertyForm'
import { listProperties } from '../../services/properties'
import { listRooms } from '../../services/rooms'

const CATEGORIES: { value: ExpenseFormValues['category']; label: string }[] = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'utility', label: 'Utility' },
  { value: 'tax', label: 'Tax' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
]

export function ExpenseForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save',
}: {
  defaultValues?: Partial<ExpenseFormValues>
  onSubmit: (values: ExpenseFormValues) => Promise<unknown>
  submitLabel?: string
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { expense_date: new Date().toISOString().slice(0, 10), category: 'maintenance', ...defaultValues },
  })

  const propertyId = watch('property_id')
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: listProperties })
  const { data: rooms } = useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: () => listRooms(propertyId),
    enabled: !!propertyId,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Property" error={errors.property_id?.message}>
        <select {...register('property_id')} className="input">
          <option value="">Select a property</option>
          {properties?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Room (optional)" error={errors.room_id?.message}>
        <select {...register('room_id')} className="input" disabled={!propertyId}>
          <option value="">Not room-specific</option>
          {rooms?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.room_number}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Category" error={errors.category?.message}>
        <select {...register('category')} className="input">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description (optional)" error={errors.description?.message}>
        <input {...register('description')} className="input" />
      </Field>
      <Field label="Amount (₹)" error={errors.amount?.message}>
        <input type="number" step="0.01" min="0" {...register('amount')} className="input" />
      </Field>
      <Field label="Date" error={errors.expense_date?.message}>
        <input type="date" {...register('expense_date')} className="input" />
      </Field>
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
