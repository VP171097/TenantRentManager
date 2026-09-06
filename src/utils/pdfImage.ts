/** Fetches an image URL (e.g. a public Supabase Storage branding logo),
 * converts it to a data URL, and works out the draw size that fits inside
 * maxW×maxH while preserving aspect ratio. Returns null on any failure —
 * a missing/unreachable logo should never block generating a PDF. */
export async function loadImageForPdf(
  url: string,
  maxW: number,
  maxH: number
): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
    if (!dataUrl) return null

    const size = await new Promise<{ w: number; h: number } | null>((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = () => resolve(null)
      img.src = dataUrl
    })
    if (!size || !size.w || !size.h) return null

    const ratio = Math.min(maxW / size.w, maxH / size.h)
    return { dataUrl, w: size.w * ratio, h: size.h * ratio }
  } catch {
    return null
  }
}
