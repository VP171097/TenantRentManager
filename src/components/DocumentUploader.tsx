import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../utils/errors'
import type { TenantDocument } from '../types/database'

export function DocumentUploader({
  ownerId,
  propertyId,
  tenantId,
  onUploaded,
}: {
  ownerId: string
  propertyId: string
  tenantId: string
  onUploaded: (doc: TenantDocument) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const path = `${ownerId}/${propertyId}/${tenantId}/${Date.now()}-${file.name}`
      const { error: uploadErr } = await supabase.storage.from('tenant-documents').upload(path, file)
      if (uploadErr) throw uploadErr

      const { data, error: dbErr } = await supabase
        .from('tenant_documents')
        .insert({ tenant_id: tenantId, owner_id: ownerId, file_path: path, file_name: file.name })
        .select()
        .single()
      if (dbErr) throw dbErr

      onUploaded(data as TenantDocument)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      <label className="btn-secondary inline-flex cursor-pointer items-center justify-center px-4">
        {uploading ? 'Uploading…' : 'Upload document'}
        <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export async function getSignedDocumentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('tenant-documents').createSignedUrl(path, 60 * 10)
  if (error) throw error
  return data.signedUrl
}
