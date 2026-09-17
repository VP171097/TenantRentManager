// Supabase Edge Function: create-tenant-login
//
// Creates a login (Supabase Auth user) for a tenant using an owner-chosen
// password, with an email AND/OR a phone number as real, confirmed Auth
// identifiers — no SMS OTP step, since this app does not set up Supabase
// phone-auth SMS. Providing both lets the tenant sign in with either one.
// This requires the Auth Admin API (`auth.admin.createUser`), which only
// works with the service-role key, so it must run server-side here.
//
// Authorization: only the tenant's OWNING OWNER may create a login for
// that tenant. We verify this using a request-scoped client (RLS applies,
// so `tenants` select is scoped to what the caller can see) before ever
// touching the service-role client.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3'

// Inlined (not imported from ../_shared/cors.ts) so this function is a
// single self-contained file — the Supabase Dashboard's paste-in editor
// can't resolve relative imports to files outside the function itself.
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

function normalizePhone(identifier: string): string {
  const trimmed = identifier.trim()
  if (trimmed.startsWith('+')) return trimmed.replace(/[\s-]/g, '')
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}

interface Body {
  tenantId: string
  email?: string
  phone?: string
  password: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401)

    const body = (await req.json().catch(() => null)) as Body | null
    if (!body?.tenantId || !body?.password) {
      return jsonResponse({ error: 'tenantId and password are required' }, 400)
    }
    const email = body.email?.trim() ? body.email.trim().toLowerCase() : undefined
    const phone = body.phone?.trim() ? normalizePhone(body.phone) : undefined
    if (!email && !phone) return jsonResponse({ error: 'Provide an email or a mobile number (or both).' }, 400)
    if (body.password.length < 8 || !/[a-zA-Z]/.test(body.password) || !/[0-9]/.test(body.password)) {
      return jsonResponse({ error: 'Password must be at least 8 characters, with a letter and a number.' }, 400)
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

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      ...(email ? { email, email_confirm: true } : {}),
      ...(phone ? { phone, phone_confirm: true } : {}),
      password: body.password,
      user_metadata: {
        full_name: (tenant as any).full_name,
        role: 'tenant',
        owner_id: (tenant as any).owner_id,
        phone: phone ?? null,
      }
    })

    let newUserId: string
    if (createErr || !created?.user) {
      // Recovery path: a PREVIOUS attempt (e.g. this same "Create Tenant
      // Login" click retried after a network blip) may have already
      // created the auth user but failed on a later step (profile
      // upsert / tenant link), leaving an orphaned login the owner can't
      // see. Rather than dead-ending on "already registered", find that
      // user and finish linking it instead.
      const alreadyExists = /already registered|already exists/i.test(createErr?.message ?? '')
      if (!alreadyExists) {
        return jsonResponse({ error: createErr?.message ?? 'Could not create the login.' }, 400)
      }
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
      if (listErr) {
        return jsonResponse({ error: `A login with this email/phone already exists, but could not be looked up: ${listErr.message}` }, 500)
      }
      const phoneDigits = phone?.replace(/\D/g, '')
      const existing = list.users.find((u) =>
        (email && u.email?.toLowerCase() === email) || (phoneDigits && (u.phone ?? '').replace(/\D/g, '') === phoneDigits)
      )
      if (!existing) {
        return jsonResponse({ error: 'A login with this email/phone already exists elsewhere and could not be matched automatically. Please use a different email/phone, or contact support.' }, 409)
      }
      // Reset the password (and (re)confirm both identifiers) to what was
      // just entered, so the owner's retry behaves predictably regardless
      // of what the first (partial) attempt set.
      const { error: updateErr } = await admin.auth.admin.updateUserById(existing.id, {
        password: body.password,
        ...(email ? { email, email_confirm: true } : {}),
        ...(phone ? { phone, phone_confirm: true } : {}),
      })
      if (updateErr) return jsonResponse({ error: `Could not update the existing login: ${updateErr.message}` }, 500)
      newUserId = existing.id
    } else {
      newUserId = created.user.id
    }

    // Controlled, already-authorized server-side write — intentionally
    // bypasses RLS via the service-role client.
    const { error: profileErr } = await admin.from('profiles').upsert({
      id: newUserId,
      role: 'tenant',
      full_name: (tenant as any).full_name,
      email: email ?? null,
      phone: phone ?? null,
      owner_id: (tenant as any).owner_id,
    })
    if (profileErr) return jsonResponse({ error: `Login created but profile setup failed: ${profileErr.message}` }, 500)

    const { error: linkErr } = await admin.from('tenants').update({ profile_id: newUserId }).eq('id', body.tenantId)
    if (linkErr) return jsonResponse({ error: `Login created but tenant link failed: ${linkErr.message}` }, 500)

    return jsonResponse({ success: true, email: email ?? null, phone: phone ?? null })
  } catch (err) {
    return jsonResponse({ error: (err as Error).message ?? 'Unexpected error' }, 500)
  }
})
