/** Converts a Supabase/Postgres error into a friendly, non-technical message. */
export function friendlyError(error: unknown): string {
  if (!error) return 'Something went wrong. Please try again.'
  const message = (error as { message?: string })?.message ?? String(error)
  const code = (error as { code?: string })?.code

  if (code === '23505' || /duplicate key/i.test(message)) {
    if (/room_number/i.test(message)) return 'A room with this number already exists in this property.'
    if (/tenant_id.*billing_month|billing_month.*tenant_id/i.test(message))
      return 'A bill for this tenant and month already exists.'
    if (/effective_date/i.test(message)) return 'A rent revision already exists for this date.'
    if (/receipt_number/i.test(message)) return 'This receipt number already exists.'
    return 'This record already exists.'
  }
  if (code === '23503' || /foreign key/i.test(message)) {
    return 'This action cannot be completed because related data is still linked to it.'
  }
  if (code === '23514' || /check constraint/i.test(message)) {
    if (/base_rent|rent_amount/i.test(message)) return 'Rent amount cannot be negative.'
    if (/reading/i.test(message)) return 'The current meter reading cannot be lower than the previous one. If the meter was reset, mark it as a meter reset and explain why.'
    if (/amount/i.test(message)) return 'Amount must be greater than zero.'
    return 'The values entered are not valid.'
  }
  if (/JWT|not authenticated|401/i.test(message)) return 'Your session has expired. Please log in again.'
  if (/permission denied|row-level security/i.test(message)) return "You don't have permission to do this."
  if (/network/i.test(message)) return 'Network error. Please check your connection and try again.'

  return 'Something went wrong. Please try again, or contact support if this continues.'
}
