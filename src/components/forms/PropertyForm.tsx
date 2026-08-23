import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { propertySchema, type PropertyFormValues } from '../../utils/validation'

export function PropertyForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save',
}: {
  defaultValues?: Partial<PropertyFormValues>
  onSubmit: (values: PropertyFormValues) => Promise<unknown>
  submitLabel?: string
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormValues>({ resolver: zodResolver(propertySchema), defaultValues })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Property name" error={errors.name?.message}>
        <input {...register('name')} className="input" />
      </Field>
      <Field label="Code (used in receipt numbers)" error={errors.code?.message}>
        <input {...register('code')} className="input uppercase" />
      </Field>
      <Field label="Address" error={errors.address?.message}>
        <input {...register('address')} className="input" />
      </Field>
      <Field label="City" error={errors.city?.message}>
        <input {...register('city')} className="input" />
      </Field>
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
