// Supabase Edge Function: owner-reset-login-password
//
// Lets an owner directly set a new password for one of THEIR OWN tenants'
// or managers' existing logins — e.g. when the tenant forgot it and can't
// use the email-link or phone+name self-service flows (no email on file,
// or they don't remember the exact name spelling on record). The owner
// already knows/controls the tenant relationship, so this is the simplest
// and most reliable reset path.
//
// Authorization: verified the same way as create-tenant-login — a
// request-scoped client (RLS applies) is used to look up the tenant or
// manager row, and we additionally require owner_id === caller (not just
// "visible to caller", since managers must not reset each other's or the
// owner's passwords).

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

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[a-zA-Z]/.test(password)) return 'Password must include at least one letter.'
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.'
  return null
}

interface Body {
  kind: 'tenant' | 'manager'
  id: string
  new_password: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401)

    const body = (await req.json().catch(() => null)) as Body | null
    if (!body?.kind || !body?.id || !body?.new_password) {
      return jsonResponse({ error: 'kind, id and new_password are required' }, 400)
    }
    if (body.kind !== 'tenant' && body.kind !== 'manager') {
      return jsonResponse({ error: 'kind must be "tenant" or "manager"' }, 400)
    }
    const passwordError = validatePassword(body.new_password)
    if (passwordError) return jsonResponse({ error: passwordError }, 400)

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userErr,
    } = await callerClient.auth.getUser()
    if (userErr || !user) return jsonResponse({ error: 'Not authenticated' }, 401)

    const table = body.kind === 'tenant' ? 'tenants' : 'managers'
    const { data: row, error: rowErr } = await callerClient
      .from(table)
      .select('id, owner_id, profile_id, full_name')
      .eq('id', body.id)
      .maybeSingle()
    if (rowErr) return jsonResponse({ error: rowErr.message }, 500)
    if (!row) return jsonResponse({ error: `${body.kind === 'tenant' ? 'Tenant' : 'Manager'} not found or not accessible.` }, 404)
    if ((row as any).owner_id !== user.id) {
      const { data: coOwner } = await callerClient
        .from('managers')
        .select('id')
        .eq('profile_id', user.id)
        .eq('owner_id', (row as any).owner_id)
        .eq('is_co_owner', true)
        .maybeSingle()
      if (!coOwner) {
        return jsonResponse({ error: 'Only the property owner (or a co-owner) can reset this login.' }, 403)
      }
    }
    if (!(row as any).profile_id) {
      return jsonResponse({ error: 'This person does not have a login yet — create one first.' }, 400)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { error: updateErr } = await admin.auth.admin.updateUserById((row as any).profile_id, {
      password: body.new_password,
    })
    if (updateErr) return jsonResponse({ error: updateErr.message }, 500)

    return jsonResponse({ success: true })
  } catch (err) {
    return jsonResponse({ error: (err as Error).message ?? 'Unexpected error' }, 500)
  }
})
