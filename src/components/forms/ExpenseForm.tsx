import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { expenseSchema, type ExpenseFormValues } from '../../utils/validation'
import { Field } from './PropertyForm'
import { listProperties } from '../../services/properties'
import { listRooms } from '../../services/rooms'

const CATEGORIES: { value: ExpenseFormValues['category']; label: string }[] = [
  { value: 'cleaning', label: 'Cleaning' },
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

  const uniqueFloors = Array.from(new Set((rooms || []).map((r) => r.floor).filter(Boolean) as string[]))

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
      <Field label="Floor (optional, to apply to all rooms on a floor)" error={errors.floor?.message}>
        <select {...register('floor')} className="input" disabled={!propertyId}>
          <option value="">All Floors / Not Floor-Specific</option>
          {uniqueFloors.map((floor) => (
            <option key={floor} value={floor}>
              Floor {floor}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Specific Room (optional)" error={errors.room_id?.message}>
        <select {...register('room_id')} className="input" disabled={!propertyId || !!watch('floor')}>
          <option value="">All Rooms on selected Floor/Property</option>
          {rooms
            ?.filter((r) => !watch('floor') || r.floor === watch('floor'))
            .map((r) => (
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
      <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <input type="checkbox" id="chargeToTenant" {...register('charge_to_tenant')} className="h-4 w-4 rounded border-slate-300" />
        <label htmlFor="chargeToTenant" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Charge expense to tenant(s)
          <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
            If selected, the amount will be split equally and added to the unpaid bill of active tenants in the selected room(s).
          </span>
        </label>
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
