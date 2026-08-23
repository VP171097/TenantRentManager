import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { roomSchema, type RoomFormValues } from '../../utils/validation'
import { Field } from './PropertyForm'

export function RoomForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save',
}: {
  defaultValues?: Partial<RoomFormValues>
  onSubmit: (values: RoomFormValues) => Promise<unknown>
  submitLabel?: string
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormValues>({ resolver: zodResolver(roomSchema), defaultValues })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Room number" error={errors.room_number?.message}>
        <input {...register('room_number')} className="input" />
      </Field>
      <Field label="Floor" error={errors.floor?.message}>
        <input {...register('floor')} className="input" />
      </Field>
      <Field label="Base rent (₹/month)" error={errors.base_rent?.message}>
        <input type="number" step="0.01" min="0" {...register('base_rent')} className="input" />
      </Field>
      <Field label="Notes" error={errors.notes?.message}>
        <textarea {...register('notes')} className="input" rows={3} />
      </Field>
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
