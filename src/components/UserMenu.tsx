import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface UserMenuLink {
  to: string
  label: string
  icon: string
}

/** Name/avatar button, top-right, that opens a dropdown with account
 * links (Profile/Settings/etc.) and Sign out — consolidating what used
 * to be a bare "Sign out" text link into one place. */
export function UserMenu({ links }: { links: UserMenuLink[] }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/login')
  }

  const initials = (profile?.full_name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
          {initials}
        </span>
        <span className="hidden max-w-[10rem] truncate sm:inline">{profile?.full_name ?? 'Account'}</span>
        <span aria-hidden className="text-xs text-slate-400">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{profile?.full_name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{profile?.email || profile?.phone}</p>
          </div>
          {links.map((link) => (
            <button
              key={link.to}
              onClick={() => {
                setOpen(false)
                navigate(link.to)
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <span aria-hidden>{link.icon}</span>
              {link.label}
            </button>
          ))}
          <div className="border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <span aria-hidden>🚪</span>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
