// Supabase Edge Function: reset-password-by-phone
//
// Self-service password reset for tenants/managers who log in with a phone
// number instead of an email. Supabase's built-in password-recovery email
// flow (`resetPasswordForEmail`) only works for email logins — there is no
// SMS OTP set up in this app (that requires a paid SMS provider + India DLT
// template registration, which is a separate business decision, not a code
// change). Instead, the caller proves ownership of the account by supplying
// BOTH the phone number on file AND the exact full name on file for that
// tenant/manager — a reasonable bar for a small, trusted-tenant app,
// without needing any SMS infrastructure.
//
// This is a public, unauthenticated endpoint (the whole point is the caller
// isn't signed in), so it must run entirely against the service-role client
// and never trust anything from the request beyond the phone+name lookup.

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

function normalizePhone(identifier: string): string {
  const trimmed = identifier.trim()
  if (trimmed.startsWith('+')) return trimmed.replace(/[\s-]/g, '')
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

interface Body {
  phone: string
  full_name: string
  new_password: string
}

const NO_MATCH_ERROR =
  'No account matches that mobile number and name. Double-check both, or ask your landlord to reset your password for you.'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const body = (await req.json().catch(() => null)) as Body | null
    if (!body?.phone || !body?.full_name || !body?.new_password) {
      return jsonResponse({ error: 'Mobile number, full name and new password are required.' }, 400)
    }
    if (body.new_password.length < 6) {
      return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400)
    }

    const phone = normalizePhone(body.phone)
    const name = normalizeName(body.full_name)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: tenant } = await admin
      .from('tenants')
      .select('id, profile_id, full_name')
      .eq('phone', phone)
      .not('profile_id', 'is', null)
      .maybeSingle()

    let profileId: string | null = null
    if (tenant && normalizeName((tenant as any).full_name ?? '') === name) {
      profileId = (tenant as any).profile_id
    }

    if (!profileId) {
      const { data: manager } = await admin
        .from('managers')
        .select('id, profile_id, full_name')
        .eq('phone', phone)
        .not('profile_id', 'is', null)
        .maybeSingle()
      if (manager && normalizeName((manager as any).full_name ?? '') === name) {
        profileId = (manager as any).profile_id
      }
    }

    if (!profileId) return jsonResponse({ error: NO_MATCH_ERROR }, 404)

    const { error: updateErr } = await admin.auth.admin.updateUserById(profileId, { password: body.new_password })
    if (updateErr) return jsonResponse({ error: updateErr.message }, 500)

    return jsonResponse({ success: true })
  } catch (err) {
    return jsonResponse({ error: (err as Error).message ?? 'Unexpected error' }, 500)
  }
})
