import { supabase } from '../lib/supabase'

/** Public "Contact Us" form submission — no account/session required.
 * Insert-only on the server side (see 037_contact_messages.sql); the app
 * never reads these back. */
export async function submitContactMessage(input: {
  name: string
  email?: string
  phone?: string
  message: string
}): Promise<void> {
  const { error } = await supabase.from('contact_messages').insert({
    name: input.name.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    message: input.message.trim(),
  })
  if (error) throw error
}
