import { Link } from 'react-router-dom'
import { PublicHeader } from '../components/PublicHeader'
import { PublicFooter } from '../components/PublicFooter'

const LINKS: { to: string; label: string }[] = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/services', label: 'Services' },
  { to: '/blog', label: 'Blogs' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/login', label: 'Sign in' },
  { to: '/login?mode=signup', label: 'Register' },
  { to: '/terms', label: 'Terms and Conditions' },
  { to: '/privacy', label: 'Privacy Policy' },
]

export function SitemapPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader />
      <main className="landing-shell max-w-xl py-20">
        <p className="eyebrow text-brand-700 dark:text-brand-300">Sitemap</p>
        <h1 className="mt-3 text-4xl">Every page, in one place.</h1>
        <ul className="mt-12 space-y-3">
          {LINKS.map((link) => (
            <li key={link.to} className="border-b border-slate-200 pb-3 dark:border-slate-800">
              <Link to={link.to} className="text-base font-medium text-slate-700 hover:text-brand-700 dark:text-slate-200 dark:hover:text-brand-300">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <PublicFooter />
    </div>
  )
}
