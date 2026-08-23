import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { electricitySchema, type ElectricityFormValues } from '../../utils/validation'
import { Field } from './PropertyForm'
import type { Tenant } from '../../types/database'

export function ElectricityForm({
  tenants,
  defaultValues,
  onSubmit,
}: {
  tenants: (Tenant & { room_id: string })[]
  defaultValues?: Partial<ElectricityFormValues>
  onSubmit: (values: ElectricityFormValues) => Promise<unknown>
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ElectricityFormValues>({
    resolver: zodResolver(electricitySchema),
    defaultValues: { is_meter_reset: false, ...defaultValues },
  })
  const isMeterReset = watch('is_meter_reset')

  return (
    <form
      onSubmit={handleSubmit((values) => {
        const tenant = tenants.find((t) => t.id === values.tenant_id)
        return onSubmit({ ...values, room_id: tenant?.room_id ?? values.room_id })
      })}
      className="space-y-4"
    >
      <Field label="Tenant" error={errors.tenant_id?.message}>
        <select {...register('tenant_id')} className="input">
          <option value="">Select a tenant</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Billing month" error={errors.billing_month?.message}>
        <input type="month" {...register('billing_month')} className="input" />
      </Field>
      <Field label="Previous reading" error={errors.previous_reading?.message}>
        <input type="number" step="0.01" min="0" {...register('previous_reading')} className="input" />
      </Field>
      <Field label="Current reading" error={errors.current_reading?.message}>
        <input type="number" step="0.01" min="0" {...register('current_reading')} className="input" />
      </Field>
      <Field label="Rate per unit (₹)" error={errors.rate_per_unit?.message}>
        <input type="number" step="0.01" min="0" {...register('rate_per_unit')} className="input" />
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" {...register('is_meter_reset')} />
        Meter was reset / replaced
      </label>
      {isMeterReset && (
        <Field label="Explanation" error={errors.reset_explanation?.message}>
          <textarea {...register('reset_explanation')} className="input" rows={2} />
        </Field>
      )}
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Saving…' : 'Save Reading'}
      </button>
    </form>
  )
}
