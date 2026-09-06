// Supabase Edge Function: create-manager-login
//
// Creates a login (Supabase Auth user) for a manager using an owner-chosen
// password, with EITHER an email OR a phone number as the identifier — no
// SMS OTP step. Mirrors create-tenant-login exactly, for managers instead
// of tenants.
//
// Authorization: only the manager's OWNING OWNER may create a login for
// that manager. Verified via a request-scoped client (RLS-scoped, so the
// managers row only comes back if the caller can see it) before ever
// touching the service-role client.

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isEmailIdentifier(identifier: string): boolean {
  return EMAIL_RE.test(identifier.trim())
}

function normalizePhoneIdentifier(identifier: string): string {
  const trimmed = identifier.trim()
  if (trimmed.startsWith('+')) return trimmed.replace(/[\s-]/g, '')
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}

interface Body {
  managerId: string
  identifier: string
  password: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401)

    const body = (await req.json().catch(() => null)) as Body | null
    if (!body?.managerId || !body?.identifier || !body?.password) {
      return jsonResponse({ error: 'managerId, identifier and password are required' }, 400)
    }
    if (body.password.length < 6) {
      return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400)
    }

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userErr,
    } = await callerClient.auth.getUser()
    if (userErr || !user) return jsonResponse({ error: 'Not authenticated' }, 401)

    const { data: manager, error: mErr } = await callerClient
      .from('managers')
      .select('id, owner_id, full_name, profile_id')
      .eq('id', body.managerId)
      .maybeSingle()
    if (mErr) return jsonResponse({ error: mErr.message }, 500)
    if (!manager) return jsonResponse({ error: 'Manager not found or not accessible.' }, 404)

    if ((manager as any).owner_id !== user.id) {
      return jsonResponse({ error: 'Only the property owner can create a manager login.' }, 403)
    }
    if ((manager as any).profile_id) {
      return jsonResponse({ error: 'This manager already has a login.' }, 400)
    }

    const isEmail = isEmailIdentifier(body.identifier)
    const identifier = isEmail ? body.identifier.trim().toLowerCase() : normalizePhoneIdentifier(body.identifier)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: created, error: createErr } = await admin.auth.admin.createUser(
      isEmail
        ? { email: identifier, password: body.password, email_confirm: true }
        : { phone: identifier, password: body.password, phone_confirm: true }
    )
    if (createErr || !created?.user) {
      return jsonResponse({ error: createErr?.message ?? 'Could not create the login.' }, 400)
    }

    const newUserId = created.user.id

    const { error: profileErr } = await admin.from('profiles').upsert({
      id: newUserId,
      role: 'manager',
      full_name: (manager as any).full_name,
      email: isEmail ? identifier : null,
      phone: isEmail ? null : identifier,
      owner_id: (manager as any).owner_id,
    })
    if (profileErr) return jsonResponse({ error: `Login created but profile setup failed: ${profileErr.message}` }, 500)

    const { error: linkErr } = await admin.from('managers').update({ profile_id: newUserId }).eq('id', body.managerId)
    if (linkErr) return jsonResponse({ error: `Login created but manager link failed: ${linkErr.message}` }, 500)

    return jsonResponse({ success: true, identifier })
  } catch (err) {
    return jsonResponse({ error: (err as Error).message ?? 'Unexpected error' }, 500)
  }
})
