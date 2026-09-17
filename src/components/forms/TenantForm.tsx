import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { tenantSchema, type TenantFormValues } from '../../utils/validation'
import { Field } from './PropertyForm'
import { listProperties } from '../../services/properties'
import { listRooms } from '../../services/rooms'
import { ImageUploader } from '../ImageUploader'
import { useEffect, useState } from 'react'

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
    setValue,
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

  const roomId = watch('room_id')
  useEffect(() => {
    if (roomId && rooms && !defaultValues?.initial_rent) {
      const selectedRoom = rooms.find((r) => r.id === roomId)
      if (selectedRoom) {
        setValue('initial_rent', selectedRoom.base_rent, { shouldValidate: true })
      }
    }
  }, [roomId, rooms, defaultValues, setValue])

  // The room already has its own electricity rate on file — don't make
  // the owner re-enter it for every tenant in that room. Auto-fill it
  // (still editable below, for the rare tenant on a different rate).
  useEffect(() => {
    if (roomId && rooms && !defaultValues?.electricity_rate) {
      const selectedRoom = rooms.find((r) => r.id === roomId)
      if (selectedRoom?.electricity_rate) {
        setValue('electricity_rate', selectedRoom.electricity_rate, { shouldValidate: true })
      }
    }
  }, [roomId, rooms, defaultValues, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700 dark:bg-sky-950 dark:text-sky-300">
        Fill in what you know now. Anything left blank (phone, email) can be filled in by the tenant themselves via
        an invite link after you save.
      </p>
      <Field label="Profile Picture (optional)" error={errors.avatar_url?.message}>
        <ImageUploader
          path={`tenant-avatars/${Date.now()}`}
          bucket="avatars"
          label="Upload Avatar"
          currentUrl={watch('avatar_url')}
          onUploaded={(url) => setValue('avatar_url', url, { shouldValidate: true })}
        />
      </Field>
      <Field label="Full name" error={errors.full_name?.message}>
        <input {...register('full_name')} className="input" />
      </Field>
      <Field label="Mobile number (optional — leave blank if you'll send an invite link instead)" error={errors.phone?.message}>
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
            // Always keep the tenant's own currently-assigned room in the
            // list, even though it's "occupied" (by them) — otherwise,
            // since a native <select> can't display a value that has no
            // matching <option>, the browser silently falls back to the
            // blank option, and submitting without touching this field
            // would send room_id: '' and unassign the tenant's real room.
            ?.filter((r) => showAll || r.status === 'vacant' || r.id === defaultValues?.room_id)
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.room_number}{' '}
                {r.id === defaultValues?.room_id ? '(current)' : r.status === 'occupied' ? '(occupied)' : ''}
              </option>
            ))}
        </select>
        <label className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
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
      <div className="grid grid-cols-2 gap-4">
        <Field label="Starting Electricity Unit" error={errors.electricity_start_reading?.message}>
          <input type="number" step="1" min="0" {...register('electricity_start_reading')} className="input" />
        </Field>
        <Field label="Electricity Rate (₹/unit)" error={errors.electricity_rate?.message}>
          <input type="number" step="0.01" min="0" {...register('electricity_rate')} className="input" />
        </Field>
      </div>
      {roomId && rooms?.find((r) => r.id === roomId)?.electricity_rate ? (
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
          Pre-filled from this room's electricity rate — change it only if this tenant pays a different rate.
        </p>
      ) : null}
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
