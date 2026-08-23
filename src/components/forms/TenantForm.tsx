import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { tenantSchema, type TenantFormValues } from '../../utils/validation'
import { Field } from './PropertyForm'
import { listProperties } from '../../services/properties'
import { listRooms } from '../../services/rooms'
import { useState } from 'react'

export function TenantForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save',
}: {
  defaultValues?: Partial<TenantFormValues>
  onSubmit: (values: TenantFormValues) => Promise<unknown>
  submitLabel?: string
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TenantFormValues>({ resolver: zodResolver(tenantSchema), defaultValues })

  const propertyId = watch('property_id')
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: listProperties })
  const { data: rooms } = useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: () => listRooms(propertyId),
    enabled: !!propertyId,
  })
  const [showAll, setShowAll] = useState(false)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Full name" error={errors.full_name?.message}>
        <input {...register('full_name')} className="input" />
      </Field>
      <Field label="Mobile number" error={errors.phone?.message}>
        <input {...register('phone')} className="input" />
      </Field>
      <Field label="Email (optional)" error={errors.email?.message}>
        <input {...register('email')} className="input" />
      </Field>
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
      <Field label="Room" error={errors.room_id?.message}>
        <select {...register('room_id')} className="input" disabled={!propertyId}>
          <option value="">Select a room</option>
          {rooms
            ?.filter((r) => showAll || r.status === 'vacant')
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.room_number} {r.status === 'occupied' ? '(occupied)' : ''}
              </option>
            ))}
        </select>
        <label className="mt-1 flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show occupied rooms too
        </label>
      </Field>
      <Field label="Move-in date" error={errors.move_in_date?.message}>
        <input type="date" {...register('move_in_date')} className="input" />
      </Field>
      <Field label="Security deposit (₹)" error={errors.security_deposit?.message}>
        <input type="number" step="0.01" min="0" {...register('security_deposit')} className="input" />
      </Field>
      <Field label="Monthly rent (₹)" error={errors.initial_rent?.message}>
        <input type="number" step="0.01" min="0" {...register('initial_rent')} className="input" />
      </Field>
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
