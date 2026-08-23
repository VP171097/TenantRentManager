import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { LoadingState, ErrorState } from '../../components/States'
import { DocumentUploader } from '../../components/DocumentUploader'
import { updateOwnTenantProfile } from '../../services/tenants'
import { friendlyError } from '../../utils/errors'
import type { Tenant, TenantDocument } from '../../types/database'

async function loadMyTenant(profileId: string): Promise<Tenant> {
  const { data, error } = await supabase.from('tenants').select('*').eq('profile_id', profileId).single()
  if (error) throw error
  return data as Tenant
}

export function TenantProfilePage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [docs, setDocs] = useState<TenantDocument[]>([])

  const { data: tenant, isLoading, error, refetch } = useQuery({
    queryKey: ['my-tenant-profile', profile?.id],
    queryFn: () => loadMyTenant(profile!.id),
    enabled: !!profile,
  })

  useEffect(() => {
    if (tenant) {
      setPhone(tenant.phone)
      setEmail(tenant.email ?? '')
    }
  }, [tenant])

  const mutation = useMutation({
    mutationFn: () => updateOwnTenantProfile(phone, email || null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tenant-profile', profile?.id] })
      setMessage('Contact details updated.')
    },
    onError: (err) => setMessage(friendlyError(err)),
  })

  if (isLoading) return <LoadingState />
  if (error || !tenant) return <ErrorState message="Could not load your profile." onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">My Profile</h1>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700">Full name</label>
          <p className="mt-1 text-slate-600">{tenant.full_name}</p>
          <p className="text-xs text-slate-400">To change your name, contact your landlord.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" />
        </div>
        {message && <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p>}
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="btn-primary w-full"
        >
          {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-bold text-slate-900">My Documents</h2>
        <p className="text-sm text-slate-500">Upload ID proof or other documents for your landlord.</p>
        <DocumentUploader
          ownerId={tenant.owner_id}
          propertyId={tenant.property_id}
          tenantId={tenant.id}
          onUploaded={(doc) => setDocs((d) => [...d, doc])}
        />
        <ul className="space-y-1">
          {docs.map((d) => (
            <li key={d.id} className="text-sm text-slate-600">
              {d.file_name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
