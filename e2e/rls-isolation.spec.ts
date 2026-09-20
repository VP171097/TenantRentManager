import { test, expect } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const enabled = process.env.E2E_RLS_TESTS === 'true'
const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

type Credentials = { email?: string; password?: string }

function creds(prefix: string): Credentials {
  return { email: process.env[`E2E_${prefix}_EMAIL`], password: process.env[`E2E_${prefix}_PASSWORD`] }
}

async function signIn(c: Credentials): Promise<SupabaseClient> {
  const client = createClient(url!, key!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { error } = await client.auth.signInWithPassword({ email: c.email!, password: c.password! })
  if (error) throw error
  return client
}

async function assertCrossOwnerHidden(
  ownerA: SupabaseClient,
  ownerB: SupabaseClient,
  table: string,
  ownerAColumn: string,
  idColumn = 'id',
) {
  const { data: aRows, error: aError } = await ownerA.from(table).select(idColumn).limit(1) as { data: Array<Record<string, unknown>> | null; error: unknown }
  expect(aError, `${table}: owner A baseline query`).toBeNull()

  const { data: bRows, error: bError } = await ownerB.from(table).select(idColumn).limit(1) as { data: Array<Record<string, unknown>> | null; error: unknown }
  expect(bError, `${table}: owner B baseline query`).toBeNull()

  if (!bRows?.length || !aRows?.length) return

  const foreignId = bRows[0][idColumn]
  const { data, error } = await ownerA.from(table).select(idColumn).eq(idColumn, foreignId)
  expect(error, `${table}: cross-owner query should not error`).toBeNull()
  expect(data ?? [], `${table}: owner A must not see owner B's row`).toHaveLength(0)

  // Sanity check: the owner A client can still see its own row.
  const ownId = aRows[0][idColumn]
  const { data: ownData } = await ownerA.from(table).select(idColumn).eq(idColumn, ownId)
  expect(ownData ?? [], `${table}: owner A lost access to own row`).toHaveLength(1)

  // Keep the parameter explicit so this helper remains easy to extend for
  // tables whose policy path is based on a different ownership column.
  void ownerAColumn
}

test.describe('database RLS isolation', () => {
  test.skip(
    !enabled ||
      !url ||
      !key ||
      !creds('OWNER').email ||
      !creds('OWNER').password ||
      !creds('OWNER_B').email ||
      !creds('OWNER_B').password,
    'Enable E2E_RLS_TESTS with two owner credentials and Supabase client configuration.',
  )

  test('owner-to-owner isolation covers core rental tables', async () => {
    const ownerA = await signIn(creds('OWNER'))
    const ownerB = await signIn(creds('OWNER_B'))

    try {
      for (const table of [
        'properties',
        'rooms',
        'tenants',
        'bills',
        'payments',
        'receipts',
        'expenses',
        'maintenance_requests',
        'rent_revisions',
        'electricity_readings',
      ]) {
        await assertCrossOwnerHidden(ownerA, ownerB, table, 'owner_id')
      }
    } finally {
      await Promise.all([ownerA.auth.signOut(), ownerB.auth.signOut()])
    }
  })

  test('tenant-to-tenant isolation prevents reading another tenant', async () => {
    const tenantA = creds('TENANT')
    const tenantB = creds('TENANT_B')
    test.skip(!tenantA.email || !tenantA.password || !tenantB.email || !tenantB.password, 'Two tenant credentials are required.')

    const a = await signIn(tenantA)
    const b = await signIn(tenantB)

    try {
      const { data: aRows, error: aError } = await a.from('tenants').select('id,owner_id,property_id,room_id')
      const { data: bRows, error: bError } = await b.from('tenants').select('id,owner_id,property_id,room_id')
      expect(aError).toBeNull()
      expect(bError).toBeNull()
      expect(aRows ?? []).toHaveLength(1)
      expect(bRows ?? []).toHaveLength(1)

      const aTenantId = aRows![0].id
      const bTenantId = bRows![0].id
      expect(aTenantId).not.toBe(bTenantId)

      const { data: foreignTenant } = await a.from('tenants').select('id').eq('id', bTenantId)
      expect(foreignTenant ?? []).toHaveLength(0)

      for (const table of ['bills', 'payments', 'receipts', 'rent_revisions', 'electricity_readings', 'maintenance_requests']) {
        const { data: foreignRows, error } = await a.from(table).select('id').eq('tenant_id', bTenantId)
        expect(error, `${table}: tenant cross-read`).toBeNull()
        expect(foreignRows ?? [], `${table}: tenant A must not see tenant B rows`).toHaveLength(0)
      }

      const { data: ownBills } = await a.from('bills').select('id').eq('tenant_id', aTenantId)
      expect(ownBills).toBeDefined()
    } finally {
      await Promise.all([a.auth.signOut(), b.auth.signOut()])
    }
  })
})
