import { z } from 'zod'

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')

export const emailSchema = z.string().trim().email('Enter a valid email address').or(z.literal('')).optional()

export const propertySchema = z.object({
  name: z.string().trim().min(2, 'Property name is required'),
  code: z
    .string()
    .trim()
    .min(2, 'Code must be at least 2 characters')
    .max(8, 'Code must be at most 8 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Code can only contain letters and numbers'),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
})
export type PropertyFormValues = z.infer<typeof propertySchema>

export const roomSchema = z.object({
  room_number: z.string().trim().min(1, 'Room number is required'),
  floor: z.string().trim().optional(),
  base_rent: z.coerce.number().min(0, 'Rent cannot be negative'),
  notes: z.string().trim().optional(),
})
export type RoomFormValues = z.infer<typeof roomSchema>

export const tenantSchema = z.object({
  full_name: z.string().trim().min(2, 'Name is required'),
  phone: phoneSchema,
  email: emailSchema,
  property_id: z.string().uuid('Select a property'),
  room_id: z.string().uuid('Select a room'),
  move_in_date: z.string().min(1, 'Move-in date is required'),
  security_deposit: z.coerce.number().min(0, 'Deposit cannot be negative'),
  initial_rent: z.coerce.number().min(0, 'Rent cannot be negative'),
})
export type TenantFormValues = z.infer<typeof tenantSchema>

export const electricitySchema = z
  .object({
    tenant_id: z.string().uuid('Select a tenant'),
    room_id: z.string().uuid(),
    billing_month: z.string().min(1, 'Billing month is required'),
    previous_reading: z.coerce.number().min(0, 'Cannot be negative'),
    current_reading: z.coerce.number().min(0, 'Cannot be negative'),
    rate_per_unit: z.coerce.number().min(0, 'Rate cannot be negative'),
    is_meter_reset: z.boolean(),
    reset_explanation: z.string().trim().optional(),
  })
  .refine((v) => v.is_meter_reset || v.current_reading >= v.previous_reading, {
    message: 'Current reading cannot be lower than previous reading unless this is a meter reset',
    path: ['current_reading'],
  })
  .refine((v) => !v.is_meter_reset || (v.reset_explanation && v.reset_explanation.length > 0), {
    message: 'Please explain the meter reset',
    path: ['reset_explanation'],
  })
export type ElectricityFormValues = z.infer<typeof electricitySchema>

export const paymentSchema = z.object({
  bill_id: z.string().uuid('Select a bill'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  payment_date: z.string().min(1, 'Payment date is required'),
  method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'other']),
  reference: z.string().trim().optional(),
})
export type PaymentFormValues = z.infer<typeof paymentSchema>

export const rentRevisionSchema = z.object({
  tenant_id: z.string().uuid(),
  effective_date: z.string().min(1, 'Effective date is required'),
  change_type: z.enum(['fixed', 'percentage']),
  change_value: z.coerce.number().positive('Enter a positive amount or percentage'),
})
export type RentRevisionFormValues = z.infer<typeof rentRevisionSchema>

export const generateBillSchema = z
  .object({
    previous_reading: z.coerce.number().min(0, 'Cannot be negative'),
    current_reading: z.coerce.number().min(0, 'Cannot be negative'),
    rate_per_unit: z.coerce.number().min(0, 'Rate cannot be negative'),
    is_meter_reset: z.boolean(),
    reset_explanation: z.string().trim().optional(),
    other_charges: z.coerce.number().min(0, 'Cannot be negative'),
    late_fee: z.coerce.number().min(0, 'Cannot be negative'),
  })
  .refine((v) => v.is_meter_reset || v.current_reading >= v.previous_reading, {
    message: 'Current reading cannot be lower than previous reading unless this is a meter reset',
    path: ['current_reading'],
  })
  .refine((v) => !v.is_meter_reset || (v.reset_explanation && v.reset_explanation.length > 0), {
    message: 'Please explain the meter reset',
    path: ['reset_explanation'],
  })
export type GenerateBillFormValues = z.infer<typeof generateBillSchema>

export const managerSchema = z.object({
  full_name: z.string().trim().min(2, 'Name is required'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: phoneSchema.optional(),
})
export type ManagerFormValues = z.infer<typeof managerSchema>
