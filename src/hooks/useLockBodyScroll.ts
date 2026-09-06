import { useEffect } from 'react'

/** Locks the page's own scroll while `locked` is true (e.g. a full-screen
 * modal is open), restoring whatever `document.body.style.overflow` was
 * set to before — not hardcoding 'auto' — so it composes correctly with
 * anything else that may have already touched it. Call unconditionally
 * (before any early `return null`) per Rules of Hooks; pass `open` as
 * `locked`. */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [locked])
}
