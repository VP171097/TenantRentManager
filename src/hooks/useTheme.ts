import { useCallback, useEffect, useState } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'rrm-theme'

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // localStorage unavailable — fall back to system
  }
  return 'system'
}

/** Applies the resolved theme to <html class="dark">. Safe to call before
 * React mounts (see index.html's inline snippet) as well as from the hook. */
export function applyTheme(pref: ThemePreference) {
  const isDark = pref === 'dark' || (pref === 'system' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', isDark)
}

/** Reads/writes the user's theme preference (persisted per-browser in
 * localStorage), defaulting to the OS preference until the user chooses
 * explicitly in Settings. */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => readStoredPreference())

  useEffect(() => {
    applyTheme(preference)
  }, [preference])

  useEffect(() => {
    if (preference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preference])

  const setTheme = useCallback((pref: ThemePreference) => {
    setPreference(pref)
    try {
      localStorage.setItem(STORAGE_KEY, pref)
    } catch {
      // ignore — preference just won't persist across reloads
    }
  }, [])

  return { theme: preference, setTheme }
}

/** Resolved light/dark boolean (following `<html class="dark">`, which
 * `applyTheme` keeps in sync with the user's preference and OS setting).
 * Used by chart components, which need explicit colors rather than
 * Tailwind's `dark:` variants. */
export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const el = document.documentElement
    const observer = new MutationObserver(() => setIsDark(el.classList.contains('dark')))
    observer.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}
