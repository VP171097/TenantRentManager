import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ErrorState } from '../../components/States'
import { SkeletonCardGrid } from '../../components/Skeleton'
import { DocumentUploader, getSignedDocumentUrl } from '../../components/DocumentUploader'
import { ImageUploader } from '../../components/ImageUploader'
import { updateOwnTenantProfile, listTenantDocuments } from '../../services/tenants'
import { friendlyError } from '../../utils/errors'
import type { Tenant } from '../../types/database'

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { data: tenant, isLoading, error, refetch } = useQuery({
    queryKey: ['my-tenant-profile', profile?.id],
    queryFn: () => loadMyTenant(profile!.id),
    enabled: !!profile,
  })

  const { data: docs = [], refetch: refetchDocs } = useQuery({
    queryKey: ['tenant-documents', tenant?.id],
    queryFn: () => listTenantDocuments(tenant!.id),
    enabled: !!tenant,
  })

  useEffect(() => {
    if (tenant) {
      setPhone(tenant.phone ?? '')
      setEmail(tenant.email ?? '')
      setAvatarUrl(tenant.avatar_url ?? null)
    }
  }, [tenant])

  const mutation = useMutation({
    mutationFn: () => updateOwnTenantProfile(phone, email || null, avatarUrl || null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tenant-profile', profile?.id] })
      setMessage('Contact details updated.')
    },
    onError: (err) => setMessage(friendlyError(err)),
  })

  if (isLoading) return <SkeletonCardGrid count={1} />
  if (error || !tenant) return <ErrorState message="Could not load your profile." onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">My Profile</h1>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Profile Picture</label>
          <ImageUploader
            path={`tenants/${tenant.id}/avatar`}
            bucket="avatars"
            label={avatarUrl ? 'Change avatar' : 'Upload avatar'}
            currentUrl={avatarUrl}
            onUploaded={setAvatarUrl}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Full name</label>
          <p className="mt-1 text-slate-600 dark:text-slate-300">{tenant.full_name}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">To change your name, contact your landlord.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" />
        </div>
        {message && <p className="rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">{message}</p>}
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="btn-primary w-full"
        >
          {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">My Documents</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Upload ID proof or other documents for your landlord.</p>
        <DocumentUploader
          ownerId={tenant.owner_id}
          propertyId={tenant.property_id}
          tenantId={tenant.id}
          onUploaded={() => refetchDocs()}
        />
        <ul className="space-y-1">
          {docs.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => getSignedDocumentUrl(d.file_path).then((url) => window.open(url, '_blank'))}
                className="text-sm text-brand-700 dark:text-brand-400 hover:underline"
              >
                {d.file_name}
              </button>
            </li>
          ))}
          {docs.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No documents uploaded yet.</p>}
        </ul>
      </div>
    </div>
  )
}
