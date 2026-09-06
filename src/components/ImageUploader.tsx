import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../utils/errors'

const MAX_BYTES = 3 * 1024 * 1024 // 3MB — plenty for a logo/cover photo, keeps PDFs/loads fast

/** Uploads an image to the public `branding` bucket under the given path
 * (must start with `${ownerId}/`, per the storage policy in migration 015)
 * and returns its public URL. Reused for both the owner logo and a
 * property's cover photo — same bucket, different path prefix. */
export function ImageUploader({
  path,
  label = 'Upload image',
  currentUrl,
  onUploaded,
}: {
  path: string
  label?: string
  currentUrl?: string | null
  onUploaded: (publicUrl: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Image is too large — please choose one under 3MB.')
      e.target.value = ''
      return
    }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const fullPath = `${path}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('branding').upload(fullPath, file, { upsert: true })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('branding').getPublicUrl(fullPath)
      onUploaded(data.publicUrl)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      {currentUrl && (
        <img src={currentUrl} alt="" className="h-14 w-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
      )}
      <div>
        <label className="btn-secondary inline-flex cursor-pointer items-center justify-center px-4">
          {uploading ? 'Uploading…' : label}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  )
}
