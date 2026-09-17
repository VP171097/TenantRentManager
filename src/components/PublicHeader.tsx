import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Moon, Sun } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useIsDarkMode, useTheme } from '../hooks/useTheme'

const NAV_LINKS = [
  { to: '/about', label: 'About Us', testId: 'landing-about-link' },
  { to: '/services', label: 'Services', testId: 'landing-services-link' },
  { to: '/blog', label: 'Blogs', testId: 'landing-blog-link' },
  { to: '/contact', label: 'Contact Us', testId: 'landing-contact-link' },
]

/** Shared header for every public (logged-out) page — landing, about,
 * services, blog, contact, terms, privacy, sitemap — so nav/branding stay
 * consistent across all of them instead of being redefined per page. */
export function PublicHeader() {
  const { session, profile } = useAuth()
  const { setTheme } = useTheme()
  const dark = useIsDarkMode()
  const destination = session ? (profile?.role === 'tenant' ? '/tenant/dashboard' : '/dashboard') : '/login'

  return (
    <header className="border-b border-slate-200 dark:border-slate-800">
      <nav aria-label="Public navigation" className="landing-shell flex h-24 items-center justify-between gap-4">
        <Link
          data-testid="landing-brand"
          to="/"
          className="flex items-center gap-2.5 text-xl font-bold tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-800 text-white">
            <BookOpen size={20} />
          </span>
          RentSlate<span className="text-brand-700">.</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm text-slate-600 dark:text-slate-300 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} data-testid={link.testId} to={link.to} className="hover:text-brand-700 dark:hover:text-brand-300">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            data-testid="landing-theme-toggle"
            className="rounded-full p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setTheme(dark ? 'light' : 'dark')}
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          {session ? (
            <Link data-testid="landing-sign-in" to={destination} className="btn-secondary !rounded-full !px-5 !py-2">
              Open app <ArrowRight size={15} />
            </Link>
          ) : (
            <>
              <Link data-testid="landing-sign-in" to="/login" className="btn-secondary !rounded-full !px-5 !py-2">
                Sign in
              </Link>
              <Link data-testid="landing-register" to="/login?mode=signup" className="btn-primary !rounded-full !px-5 !py-2">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
