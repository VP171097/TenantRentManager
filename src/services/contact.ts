import { supabase } from '../lib/supabase'

// Web3Forms access key — public by design (like a Google Analytics ID),
// meant to be embedded client-side. Emails submissions straight to the
// inbox it was created for; restrict it to this site's domain in the
// Web3Forms dashboard if you want to lock it down further.
const WEB3FORMS_ACCESS_KEY = '11eff8bc-784c-45aa-a38a-710c45d61cc8'

/** Public "Contact Us" form submission — no account/session required.
 *
 * Does two things in parallel:
 * 1. Emails the message directly via Web3Forms (free, no backend needed).
 * 2. Saves it to contact_messages as a backup, in case the email fails to
 *    send or land — insert-only on the server side (see
 *    037_contact_messages.sql), the app never reads these back.
 *
 * The email send is best-effort: if Web3Forms is down, the message is
 * still saved, so nothing is lost either way. */
export async function submitContactMessage(input: {
  name: string
  email?: string
  phone?: string
  message: string
}): Promise<void> {
  const name = input.name.trim()
  const email = input.email?.trim() || undefined
  const phone = input.phone?.trim() || undefined
  const message = input.message.trim()

  const [emailResult, dbResult] = await Promise.allSettled([
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `RentSlate contact form — ${name}`,
        name,
        email,
        phone,
        message,
      }),
    }),
    supabase.from('contact_messages').insert({ name, email: email ?? null, phone: phone ?? null, message }),
  ])

  // Only fail the whole submission if BOTH the email and the database
  // backup failed — either one succeeding means the message got through.
  const emailOk = emailResult.status === 'fulfilled' && emailResult.value.ok
  const dbOk = dbResult.status === 'fulfilled' && !dbResult.value.error
  if (!emailOk && !dbOk) {
    throw new Error('Could not send your message right now. Please try again in a moment.')
  }
}
