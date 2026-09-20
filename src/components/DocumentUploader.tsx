import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../utils/errors'
import type { TenantDocument } from '../types/database'

// Accepted by the input picker and the storage bucket's allowed_mime_types
// (see migration 042) — images for ID-proof photos/scans, plus PDF for
// scanned/exported documents.
export const ACCEPTED_DOCUMENT_TYPES = '.png,.jpg,.jpeg,.webp,.heic,.pdf'
export const ACCEPTED_DOCUMENT_TYPES_LABEL = 'PNG, JPG, WEBP, HEIC or PDF, up to 10 MB'

const DOC_TYPE_PRESETS = [
  'Aadhaar Card',
  'PAN Card',
  'Passport',
  'Voter ID',
  'Driving License',
  'Rent Agreement',
  'Police Verification',
  'Other',
]

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
  const [docType, setDocType] = useState(DOC_TYPE_PRESETS[0])
  const [customDocType, setCustomDocType] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolvedDocType = docType === 'Other' ? customDocType.trim() : docType
  const canUpload = resolvedDocType.length > 0

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!resolvedDocType) {
      setError('Please choose what this document is before uploading.')
      e.target.value = ''
      return
    }
    setUploading(true)
    setError(null)
    try {
      const path = `${ownerId}/${propertyId}/${tenantId}/${Date.now()}-${file.name}`
      const { error: uploadErr } = await supabase.storage.from('tenant-documents').upload(path, file)
      if (uploadErr) throw uploadErr

      const { data, error: dbErr } = await supabase
        .from('tenant_documents')
        .insert({ tenant_id: tenantId, owner_id: ownerId, file_path: path, file_name: file.name, doc_type: resolvedDocType })
        .select()
        .single()
      if (dbErr) throw dbErr

      onUploaded(data as TenantDocument)
      setCustomDocType('')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="input sm:max-w-[200px]"
          disabled={uploading}
        >
          {DOC_TYPE_PRESETS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {docType === 'Other' && (
          <input
            type="text"
            value={customDocType}
            onChange={(e) => setCustomDocType(e.target.value)}
            placeholder="e.g. Electricity Bill"
            className="input sm:max-w-[200px]"
            disabled={uploading}
          />
        )}
        <label
          className={`btn-secondary inline-flex items-center justify-center px-4 ${canUpload && !uploading ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
        >
          {uploading ? 'Uploading…' : 'Upload document'}
          <input
            type="file"
            accept={ACCEPTED_DOCUMENT_TYPES}
            className="hidden"
            onChange={handleFile}
            disabled={uploading || !canUpload}
          />
        </label>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">Accepted formats: {ACCEPTED_DOCUMENT_TYPES_LABEL}.</p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export async function getSignedDocumentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('tenant-documents').createSignedUrl(path, 60 * 10)
  if (error) throw error
  return data.signedUrl
}

function isImageFile(fileName: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(fileName)
}

function DocumentThumbnail({ doc }: { doc: TenantDocument }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isImageFile(doc.file_name)) return
    let cancelled = false
    getSignedDocumentUrl(doc.file_path).then((signedUrl) => {
      if (!cancelled) setUrl(signedUrl)
    })
    return () => {
      cancelled = true
    }
  }, [doc.file_path, doc.file_name])

  if (!isImageFile(doc.file_name) || !url) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      </div>
    )
  }

  return <img src={url} alt={doc.file_name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
}

export function DocumentList({ docs }: { docs: TenantDocument[] }) {
  if (docs.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">No documents uploaded yet.</p>
  }

  return (
    <ul className="space-y-2">
      {docs.map((d) => (
        <li key={d.id}>
          <button
            onClick={() => getSignedDocumentUrl(d.file_path).then((url) => window.open(url, '_blank'))}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-2 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
          >
            <DocumentThumbnail doc={d} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{d.doc_type ?? d.file_name}</p>
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                {d.doc_type ? `${d.file_name} · ` : ''}
                {new Date(d.uploaded_at).toLocaleDateString('en-IN')}
              </p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
