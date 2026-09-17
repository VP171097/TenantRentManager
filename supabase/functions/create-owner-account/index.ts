// Supabase Edge Function: create-owner-account
//
// Creates a new OWNER account with BOTH an email and a phone number set as
// real Supabase Auth identifiers on the same user — not just contact info
// in the profile — so the owner can sign in afterwards with either one.
// A plain client-side `supabase.auth.signUp()` only accepts one identifier
// (email OR phone) per call; attaching a second one via `updateUser` would
// normally require an SMS OTP confirmation step, which this app doesn't
// have configured. Using the Auth Admin API here lets us set both at
// account-creation time, confirmed, with no OTP round trip — the same
// trust model this app already uses for owner-created tenant/manager
// logins (create-tenant-login / create-manager-login).
//
// This is a public, unauthenticated endpoint (signup, by definition, has
// no session yet).

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Body {
  email: string
  phone: string
  password: string
  full_name: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const body = (await req.json().catch(() => null)) as Body | null
    if (!body?.email || !body?.phone || !body?.password || !body?.full_name) {
      return jsonResponse({ error: 'Email, mobile number, password and full name are required.' }, 400)
    }
    const email = body.email.trim().toLowerCase()
    const phone = body.phone.trim().replace(/[\s-]/g, '')
    const fullName = body.full_name.trim()

    if (!EMAIL_RE.test(email)) return jsonResponse({ error: 'Enter a valid email address.' }, 400)
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) return jsonResponse({ error: 'Enter a valid mobile number.' }, 400)
    if (body.password.length < 8 || !/[a-zA-Z]/.test(body.password) || !/[0-9]/.test(body.password)) {
      return jsonResponse({ error: 'Password must be at least 8 characters, with a letter and a number.' }, 400)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      phone,
      password: body.password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { role: 'owner', full_name: fullName, phone },
    })
    if (createErr || !created?.user) {
      const alreadyExists = /already registered|already exists/i.test(createErr?.message ?? '')
      return jsonResponse(
        { error: alreadyExists ? 'An account with this email or mobile number already exists.' : createErr?.message ?? 'Could not create the account.' },
        alreadyExists ? 409 : 400
      )
    }

    // The on_auth_user_created trigger creates the profiles row from
    // raw_user_meta_data automatically — nothing else to do here.
    return jsonResponse({ success: true })
  } catch (err) {
    return jsonResponse({ error: (err as Error).message ?? 'Unexpected error' }, 500)
  }
})
