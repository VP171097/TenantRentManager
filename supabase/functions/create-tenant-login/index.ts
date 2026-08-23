// Supabase Edge Function: create-tenant-login
//
// Creates a login (Supabase Auth user) for a tenant using an owner-chosen
// password, with EITHER an email OR a phone number as the identifier — no
// SMS OTP step, since this app does not set up Supabase phone-auth SMS.
// This requires the Auth Admin API (`auth.admin.createUser`), which only
// works with the service-role key, so it must run server-side here.
//
// Authorization: only the tenant's OWNING OWNER may create a login for
// that tenant. We verify this using a request-scoped client (RLS applies,
// so `tenants` select is scoped to what the caller can see) before ever
// touching the service-role client.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

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
  tenantId: string
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
    if (!body?.tenantId || !body?.identifier || !body?.password) {
      return jsonResponse({ error: 'tenantId, identifier and password are required' }, 400)
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

    // RLS-scoped: only rows the caller can see (owner_all / manager perms)
    // come back here, so this doubles as the authorization check.
    const { data: tenant, error: tErr } = await callerClient
      .from('tenants')
      .select('id, owner_id, full_name')
      .eq('id', body.tenantId)
      .maybeSingle()
    if (tErr) return jsonResponse({ error: tErr.message }, 500)
    if (!tenant) return jsonResponse({ error: 'Tenant not found or not accessible.' }, 404)

    // Only the OWNER may create tenant logins (not managers), matching the
    // spec: "verify caller is the owning owner".
    if ((tenant as any).owner_id !== user.id) {
      return jsonResponse({ error: 'Only the property owner can create a tenant login.' }, 403)
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

    // Controlled, already-authorized server-side write — intentionally
    // bypasses RLS via the service-role client.
    const { error: profileErr } = await admin.from('profiles').upsert({
      id: newUserId,
      role: 'tenant',
      full_name: (tenant as any).full_name,
      email: isEmail ? identifier : null,
      phone: isEmail ? null : identifier,
      owner_id: (tenant as any).owner_id,
    })
    if (profileErr) return jsonResponse({ error: `Login created but profile setup failed: ${profileErr.message}` }, 500)

    const { error: linkErr } = await admin.from('tenants').update({ profile_id: newUserId }).eq('id', body.tenantId)
    if (linkErr) return jsonResponse({ error: `Login created but tenant link failed: ${linkErr.message}` }, 500)

    return jsonResponse({ success: true, identifier })
  } catch (err) {
    return jsonResponse({ error: (err as Error).message ?? 'Unexpected error' }, 500)
  }
})
