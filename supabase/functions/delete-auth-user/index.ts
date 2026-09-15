// Supabase Edge Function: delete-auth-user
//
// Deletes a Supabase Auth user (and, via profiles.id's ON DELETE CASCADE,
// their profiles row) given a profile/user id. Requires the Auth Admin
// API, which only works with the service-role key, so it must run
// server-side.
//
// This is called two ways:
//  1. Trusted, server-to-server: a Postgres trigger (fn_tenant_auth_cleanup,
//     migration 031) fires whenever a tenant row is deleted — whether
//     directly, or cascaded from deleting the tenant's room or property —
//     and calls this via pg_net with a shared secret, so a deleted
//     tenant's login always gets cleaned up too, with no client involved.
//  2. From the app, with the caller's JWT: verifies the caller (an
//     owner) actually owns the target profile before deleting.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const AUTH_CLEANUP_SECRET = Deno.env.get('AUTH_CLEANUP_SECRET') ?? ''

interface Body {
  profileId: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const body = (await req.json().catch(() => null)) as Body | null
    if (!body?.profileId) return jsonResponse({ error: 'profileId is required' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const cronSecret = req.headers.get('X-Cron-Secret')
    const isTrustedServerCall = !!AUTH_CLEANUP_SECRET && cronSecret === AUTH_CLEANUP_SECRET

    if (!isTrustedServerCall) {
      // Human-triggered call — verify the caller owns this profile.
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

      const { data: targetProfile, error: pErr } = await admin
        .from('profiles')
        .select('id, owner_id')
        .eq('id', body.profileId)
        .maybeSingle()
      if (pErr) return jsonResponse({ error: pErr.message }, 500)
      if (!targetProfile || (targetProfile as any).owner_id !== user.id) {
        return jsonResponse({ error: 'Not authorized to delete this login.' }, 403)
      }
    }

    // profiles.id references auth.users(id) on delete cascade, so this
    // removes the profile row too. Treat "already gone" as success —
    // the goal state (no login left) is already met.
    const { error: deleteErr } = await admin.auth.admin.deleteUser(body.profileId)
    if (deleteErr && !/not found|does not exist/i.test(deleteErr.message)) {
      return jsonResponse({ error: deleteErr.message }, 500)
    }

    return jsonResponse({ success: true })
  } catch (err) {
    return jsonResponse({ error: (err as Error).message ?? 'Unexpected error' }, 500)
  }
})
