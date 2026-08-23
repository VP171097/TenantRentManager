import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { generateBillSchema, type GenerateBillFormValues } from '../../utils/validation'
import { Field } from './PropertyForm'
import { formatINR } from '../../utils/money'

/** Collects the electricity reading, rate, and any extra charges up front,
 * then hands them to the caller to save the reading + generate the bill in
 * one step — rather than requiring a separate trip to the Electricity page
 * first. */
export function GenerateBillModal({
  open,
  monthLabel,
  currentRent,
  defaultPreviousReading,
  defaultRatePerUnit,
  onClose,
  onSubmit,
}: {
  open: boolean
  monthLabel: string
  currentRent: number
  defaultPreviousReading: number
  defaultRatePerUnit: number
  onClose: () => void
  onSubmit: (values: GenerateBillFormValues) => Promise<unknown>
}) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GenerateBillFormValues>({
    resolver: zodResolver(generateBillSchema),
    defaultValues: {
      is_meter_reset: false,
      previous_reading: defaultPreviousReading,
      rate_per_unit: defaultRatePerUnit,
      other_charges: 0,
      late_fee: 0,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        is_meter_reset: false,
        previous_reading: defaultPreviousReading,
        rate_per_unit: defaultRatePerUnit,
        other_charges: 0,
        late_fee: 0,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultPreviousReading, defaultRatePerUnit])

  if (!open) return null

  const isMeterReset = watch('is_meter_reset')
  const previous = Number(watch('previous_reading')) || 0
  const current = Number(watch('current_reading')) || 0
  const rate = Number(watch('rate_per_unit')) || 0
  const other = Number(watch('other_charges')) || 0
  const lateFee = Number(watch('late_fee')) || 0
  const units = isMeterReset ? Math.max(current, 0) : Math.max(current - previous, 0)
  const electricityCharge = units * rate
  const estimatedTotal = currentRent + electricityCharge + other + lateFee

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Generate Bill — {monthLabel}</h2>
        <p className="mt-1 text-sm text-slate-500">Rent for this month: {formatINR(currentRent)}</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <Field label="Previous meter reading" error={errors.previous_reading?.message}>
            <input type="number" step="0.01" min="0" inputMode="decimal" {...register('previous_reading')} className="input" />
          </Field>
          <Field label="Current meter reading" error={errors.current_reading?.message}>
            <input type="number" step="0.01" min="0" inputMode="decimal" {...register('current_reading')} className="input" />
          </Field>
          <Field label="Rate per unit (₹)" error={errors.rate_per_unit?.message}>
            <input type="number" step="0.01" min="0" inputMode="decimal" {...register('rate_per_unit')} className="input" />
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
          <Field label="Other charges (₹)" error={errors.other_charges?.message}>
            <input type="number" step="0.01" min="0" inputMode="decimal" {...register('other_charges')} className="input" />
          </Field>
          <Field label="Late fee (₹)" error={errors.late_fee?.message}>
            <input type="number" step="0.01" min="0" inputMode="decimal" {...register('late_fee')} className="input" />
          </Field>

          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Units used</span>
              <span>{units}</span>
            </div>
            <div className="flex justify-between">
              <span>Electricity charge</span>
              <span>{formatINR(electricityCharge)}</span>
            </div>
            <div className="mt-1 flex justify-between font-semibold text-slate-900">
              <span>Estimated total (before previous balance)</span>
              <span>{formatINR(estimatedTotal)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Generating…' : 'Generate Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
