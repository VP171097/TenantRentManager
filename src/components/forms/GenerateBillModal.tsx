import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { generateBillSchema, type GenerateBillFormValues } from '../../utils/validation'
import { Field } from './PropertyForm'
import { formatINR } from '../../utils/money'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { QuickMeterDial } from '../QuickMeterDial'
import { meterPreview } from '../../utils/meter'

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
    setValue,
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

  useLockBodyScroll(open)

  if (!open) return null

  const isMeterReset = watch('is_meter_reset')
  const previous = Number(watch('previous_reading')) || 0
  const currentValue = watch('current_reading')
  const current = currentValue == null || String(currentValue) === '' ? '' : Number(currentValue)
  const rate = Number(watch('rate_per_unit')) || 0
  const other = Number(watch('other_charges')) || 0
  const lateFee = Number(watch('late_fee')) || 0
  const preview = meterPreview(previous, current, rate, isMeterReset)
  const units = preview.units
  const electricityCharge = preview.amount
  const estimatedTotal = currentRent + electricityCharge + other + lateFee

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div role="dialog" aria-modal="true" aria-label="Generate Bill" data-testid="generate-bill-dialog" className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Generate Bill — {monthLabel}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Rent for this month: {formatINR(currentRent)}</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <QuickMeterDial id="generate-meter" previous={previous} current={current} rate={rate} reset={isMeterReset} disabled={isSubmitting} onChange={value => setValue('current_reading', value === '' ? undefined as unknown as number : value, { shouldValidate: true, shouldDirty: true })} />
          {errors.current_reading && <p data-testid="generate-meter-validation" className="text-sm text-red-700 dark:text-red-300">{errors.current_reading.message}</p>}
          <details data-testid="generate-meter-settings" className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
          <summary data-testid="generate-meter-settings-toggle" className="cursor-pointer text-sm font-semibold">Meter settings & replacement</summary>
          <div className="mt-3 space-y-3"><Field label="Previous meter reading" error={errors.previous_reading?.message}>
            <input type="number" step="0.01" min="0" inputMode="decimal" {...register('previous_reading')} className="input" />
          </Field>
          <Field label="Rate per unit (₹)" error={errors.rate_per_unit?.message}>
            <input type="number" step="0.01" min="0" inputMode="decimal" {...register('rate_per_unit')} className="input" />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input type="checkbox" {...register('is_meter_reset')} />
            Meter was reset / replaced
          </label>
          {isMeterReset && (
            <Field label="Explanation" error={errors.reset_explanation?.message}>
              <textarea {...register('reset_explanation')} className="input" rows={2} />
            </Field>
          )}
          </div></details>
          <Field label="Other charges (₹)" error={errors.other_charges?.message}>
            <input type="number" step="0.01" min="0" inputMode="decimal" {...register('other_charges')} className="input" />
          </Field>
          <Field label="Late fee (₹)" error={errors.late_fee?.message}>
            <input type="number" step="0.01" min="0" inputMode="decimal" {...register('late_fee')} className="input" />
          </Field>

          <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span>Units used</span>
              <span>{units}</span>
            </div>
            <div className="flex justify-between">
              <span>Electricity charge</span>
              <span>{formatINR(electricityCharge)}</span>
            </div>
            <div className="mt-1 flex justify-between font-semibold text-slate-900 dark:text-slate-100">
              <span>Estimated total (before previous balance)</span>
              <span>{formatINR(estimatedTotal)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button data-testid="generate-bill-cancel" type="button" disabled={isSubmitting} onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button data-testid="generate-bill-submit" type="submit" disabled={isSubmitting || !preview.valid} className="btn-primary flex-1">
              {isSubmitting ? 'Generating…' : 'Generate Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
