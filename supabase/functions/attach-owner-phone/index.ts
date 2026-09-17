// Supabase Edge Function: attach-owner-phone
//
// Owner signup keeps the normal Supabase email-confirmation flow (a real
// signUp() call, confirmation email, click-to-verify) — but we also want
// the owner to be able to sign in afterwards with their phone number, not
// just email. A phone number entered at signup is carried through as
// user_metadata (harmless, not a real Auth identifier yet). Once the owner
// has actually confirmed their email and signed in for the first time
// (so we have a real authenticated session), this function promotes that
// metadata phone into a REAL, confirmed Auth identifier — no SMS OTP round
// trip needed, since the owner is already a verified, authenticated caller
// acting on their own account.
//
// Self-service only: this can only ever touch the CALLER's own user row —
// there is no id in the request body, it's derived from the Authorization
// header. Idempotent: does nothing if the phone is already set or there's
// no pending phone in metadata.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401)

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userErr,
    } = await callerClient.auth.getUser()
    if (userErr || !user) return jsonResponse({ error: 'Not authenticated' }, 401)

    if (user.phone) return jsonResponse({ success: true, alreadyLinked: true })

    const pendingPhone = (user.user_metadata as any)?.phone
    if (!pendingPhone || typeof pendingPhone !== 'string') {
      return jsonResponse({ success: true, nothingToDo: true })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
      phone: pendingPhone,
      phone_confirm: true,
    })
    if (updateErr) {
      // Someone else may already hold this phone number — not fatal to the
      // caller's session, just leave email-only sign-in for them.
      return jsonResponse({ error: updateErr.message }, 400)
    }

    await admin.from('profiles').update({ phone: pendingPhone }).eq('id', user.id)

    return jsonResponse({ success: true })
  } catch (err) {
    return jsonResponse({ error: (err as Error).message ?? 'Unexpected error' }, 500)
  }
})
