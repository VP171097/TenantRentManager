import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/** Resolves the current owner's branding logo URL for use on generated
 * PDFs — directly from the logged-in owner's own profile, or (for a
 * manager acting on the owner's behalf) by looking up the owner's profile
 * row. Tenants aren't expected to generate bill/receipt PDFs, but the
 * lookup works the same way for them too. */
export function useOwnerLogoUrl(): string | null {
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const ownerId = isOwner ? profile?.id : profile?.owner_id

  const { data } = useQuery({
    queryKey: ['owner-logo', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('logo_url').eq('id', ownerId!).maybeSingle()
      if (error) return null
      return (data as { logo_url: string | null } | null)?.logo_url ?? null
    },
    enabled: !isOwner && !!ownerId,
  })

  if (isOwner) return profile?.logo_url ?? null
  return data ?? null
}
