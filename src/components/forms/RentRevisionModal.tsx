import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { rentRevisionSchema, type RentRevisionFormValues } from '../../utils/validation'
import { Field } from './PropertyForm'
import { computeRevisedRent } from '../../utils/billing'
import { formatINR } from '../../utils/money'

export function RentRevisionModal({
  open,
  currentRent,
  tenantId,
  onClose,
  onSubmit,
}: {
  open: boolean
  currentRent: number
  tenantId: string
  onClose: () => void
  onSubmit: (values: RentRevisionFormValues & { rent_amount: number }) => Promise<unknown>
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RentRevisionFormValues>({
    resolver: zodResolver(rentRevisionSchema),
    defaultValues: { tenant_id: tenantId, change_type: 'percentage' },
  })

  if (!open) return null

  const changeType = watch('change_type')
  const changeValue = watch('change_value')
  const preview =
    changeValue && !Number.isNaN(Number(changeValue)) ? computeRevisedRent(currentRent, changeType, Number(changeValue)) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Revise Rent</h2>
        <p className="mt-1 text-sm text-slate-500">Current rent: {formatINR(currentRent)}</p>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({ ...values, rent_amount: computeRevisedRent(currentRent, values.change_type, values.change_value) })
          )}
          className="mt-4 space-y-4"
        >
          <Field label="Change type" error={errors.change_type?.message}>
            <select {...register('change_type')} className="input">
              <option value="percentage">Percentage increase</option>
              <option value="fixed">Fixed amount increase</option>
            </select>
          </Field>
          <Field label={changeType === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'} error={errors.change_value?.message}>
            <input type="number" step="0.01" min="0.01" {...register('change_value')} className="input" />
          </Field>
          <Field label="Effective date" error={errors.effective_date?.message}>
            <input type="date" {...register('effective_date')} className="input" />
          </Field>
          {preview !== null && <p className="text-sm text-slate-600">New rent will be {formatINR(preview)}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
