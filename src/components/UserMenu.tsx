import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LogOut, ChevronDown } from 'lucide-react'

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

  const roleLabel = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : ''

  const roleColor =
    profile?.role === 'owner'
      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
      : profile?.role === 'manager'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white shadow-sm">
          {initials}
        </span>
        <span className="hidden max-w-[8rem] truncate sm:inline text-slate-700 dark:text-slate-200">
          {profile?.full_name ?? 'Account'}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-xl slide-down"
        >
          {/* Header */}
          <div className="border-b border-slate-100 dark:border-slate-700 px-4 py-3.5 bg-slate-50/80 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {profile?.full_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleColor}`}>
                    {roleLabel}
                  </span>
                  {(profile?.email || profile?.phone) && (
                    <p className="truncate text-xs text-slate-400 dark:text-slate-500 max-w-[9rem]">
                      {profile?.email || profile?.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="py-1">
            {links.map((link) => (
              <button
                key={link.to}
                onClick={() => { setOpen(false); navigate(link.to) }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60 transition-colors"
              >
                <span aria-hidden className="text-base">{link.icon}</span>
                {link.label}
              </button>
            ))}
          </div>

          {/* Sign out */}
          <div className="border-t border-slate-100 dark:border-slate-700 py-1">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
