/** Whether the Web Share API is available — true on most mobile browsers
 * (opens the OS's native share sheet: WhatsApp, Messages, Instagram, Mail,
 * etc, exactly like any other app's "Share" button), false on most desktop
 * browsers (which don't implement it). Callers should fall back to
 * copy-to-clipboard when this is false. */
export function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/** Opens the native OS share sheet for a link. Resolves to false (without
 * throwing) if the user cancels the sheet or the browser doesn't support
 * it — callers should treat that as "nothing happened", not an error. */
export async function shareLink(options: { title: string; text?: string; url: string }): Promise<boolean> {
  if (!canShare()) return false
  try {
    await navigator.share(options)
    return true
  } catch (err) {
    // AbortError = user dismissed the share sheet — not a real error.
    if (err instanceof Error && err.name === 'AbortError') return false
    return false
  }
}
