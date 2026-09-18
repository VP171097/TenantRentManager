import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { listUpiIds } from '../../services/upi'
import { useAuth } from '../../hooks/useAuth'
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: { electricity_enabled: true, ...defaultValues },
  })
  const electricityEnabled = watch('electricity_enabled')

  const { profile } = useAuth()
  const ownerId = profile?.role === 'owner' ? profile.id : profile?.owner_id
  const { data: upiIds } = useQuery({
    queryKey: ['upi-ids', ownerId],
    queryFn: () => listUpiIds(ownerId!),
    enabled: !!ownerId,
  })

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
      <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <input type="checkbox" id="roomElectricityEnabled" {...register('electricity_enabled')} className="h-4 w-4 rounded border-slate-300" />
        <label htmlFor="roomElectricityEnabled" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          This room charges tenants for electricity
        </label>
      </div>
      {electricityEnabled && (
        <Field label="Electricity Rate (₹/unit)" error={errors.electricity_rate?.message}>
          <input type="number" step="0.01" min="0" {...register('electricity_rate')} className="input" />
        </Field>
      )}
      <Field label="Notes" error={errors.notes?.message}>
        <textarea {...register('notes')} className="input" rows={3} />
      </Field>
      <Field label="Custom UPI ID (Optional)" error={errors.upi_id_id?.message}>
        <select {...register('upi_id_id')} className="input">
          <option value="">Use default owner UPI ID</option>
          {upiIds?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label} ({u.upi_id})
            </option>
          ))}
        </select>
      </Field>
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
