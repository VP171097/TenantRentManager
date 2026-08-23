import { createClient } from '@supabase/supabase-js'

// Note: we intentionally do NOT pass the generated `Database` type to
// createClient here. Supabase's generic client typing requires a full
// codegen'd schema (matching every table's Row/Insert/Update shape
// precisely) to avoid inferring `never` on writes; since this project's
// types/database.ts is hand-written for domain modeling rather than
// generated via `supabase gen types`, each service module instead types
// its own inputs/outputs explicitly (see src/services/*.ts). Run
// `supabase gen types typescript` against your project for full inference
// if desired.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. Copy .env.example to .env and fill in your Supabase project details.'
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: true, autoRefreshToken: true },
})
