import { z } from 'zod'

// Generous upper bound on money fields — catches an accidental extra zero
// (₹95,000 typed as ₹950,000) without being restrictive for legitimate
// large commercial rent/deposits/expenses. Not a business rule, just a
// sanity ceiling.
const MAX_REASONABLE_AMOUNT = 1_00_00_000 // ₹1 crore
const moneySchema = (message = 'Amount cannot be negative') =>
  z.coerce.number().min(0, message).max(MAX_REASONABLE_AMOUNT, 'That amount looks unusually high — please double-check it')

// A date field shouldn't be able to drift decades away from "now" by a
// typo (e.g. a move-in date of 1901 from a mistyped year). Generous
// window: 10 years back (covers long-standing tenancies/history entry)
// to 1 year forward (covers planned future move-ins).
const REASONABLE_DATE_MIN = '2000-01-01'
function reasonableDateMax(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}
const reasonableDateSchema = (message: string) =>
  z.string().min(1, message).refine(
    (v) => v >= REASONABLE_DATE_MIN && v <= reasonableDateMax(),
    'Please check this date — it looks out of range'
  )

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')

// Symmetric with emailSchema: value is optional, but if provided must be a valid 10-digit Indian mobile number
export const optionalPhoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
  .or(z.literal(''))
  .optional()

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
  base_rent: moneySchema('Rent cannot be negative'),
  electricity_enabled: z.boolean(),
  electricity_rate: z.coerce.number().min(0, 'Must be positive').max(1000, 'That rate looks unusually high — please double-check it').optional(),
  notes: z.string().trim().optional(),
  upi_id_id: z.string().uuid().optional().or(z.literal('')),
})
export type RoomFormValues = z.infer<typeof roomSchema>

export const tenantSchema = z.object({
  full_name: z.string().trim().min(2, 'Name is required'),
  phone: optionalPhoneSchema,
  email: emailSchema,
  avatar_url: z.string().url().optional().or(z.literal('')),
  property_id: z.string().uuid('Select a property'),
  room_id: z.string().uuid('Select a room'),
  move_in_date: reasonableDateSchema('Move-in date is required'),
  security_deposit: moneySchema('Deposit cannot be negative'),
  initial_rent: moneySchema('Rent cannot be negative'),
  electricity_start_reading: z.coerce.number().min(0, 'Must be positive'),
  electricity_rate: z.coerce.number().min(0, 'Must be positive').max(1000, 'That rate looks unusually high — please double-check it'),
})
export type TenantFormValues = z.infer<typeof tenantSchema>

export const paymentSchema = z.object({
  bill_id: z.string().uuid('Select a bill'),
  amount: z.coerce.number().positive('Amount must be greater than zero').max(MAX_REASONABLE_AMOUNT, 'That amount looks unusually high — please double-check it'),
  payment_date: reasonableDateSchema('Payment date is required'),
  method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'other']),
  reference: z.string().trim().optional(),
})
export type PaymentFormValues = z.infer<typeof paymentSchema>

export const rentRevisionSchema = z
  .object({
    tenant_id: z.string().uuid(),
    effective_date: reasonableDateSchema('Effective date is required'),
    change_type: z.enum(['fixed', 'percentage']),
    change_value: z.coerce.number().positive('Enter a positive amount or percentage'),
  })
  .refine(
    (v) => (v.change_type === 'percentage' ? v.change_value <= 500 : v.change_value <= MAX_REASONABLE_AMOUNT),
    { message: 'That change looks unusually high — please double-check it', path: ['change_value'] }
  )
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
  avatar_url: z.string().url().optional().or(z.literal('')),
})
export type ManagerFormValues = z.infer<typeof managerSchema>

export const expenseSchema = z.object({
  property_id: z.string().uuid('Select a property'),
  floor: z.string().trim().optional().or(z.literal('')),
  room_id: z.string().uuid().optional().or(z.literal('')),
  category: z.enum(['maintenance', 'repair', 'utility', 'tax', 'insurance', 'other', 'cleaning']),
  description: z.string().trim().optional(),
  amount: moneySchema('Amount cannot be negative'),
  expense_date: reasonableDateSchema('Date is required'),
  charge_to_tenant: z.boolean().optional(),
})
export type ExpenseFormValues = z.infer<typeof expenseSchema>

export const maintenanceRequestSchema = z.object({
  title: z.string().trim().min(2, 'Please describe the problem briefly'),
  description: z.string().trim().optional(),
})
export type MaintenanceRequestFormValues = z.infer<typeof maintenanceRequestSchema>
