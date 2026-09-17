import { Link } from 'react-router-dom'

/** Shared footer for every public page — a solid dark band (matches the
 * editorial, monochrome look of the marketing pages) with brand + nav on
 * one row and the legal links underneath. */
export function PublicFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-warm-900 text-warm-100">
      <div className="landing-shell flex flex-wrap items-center justify-between gap-4 py-7">
        <Link data-testid="landing-footer-brand" to="/" className="font-display text-xl font-bold tracking-tight text-white">
          RentSlate<span className="text-slate-400">.</span>
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
          <Link data-testid="landing-footer-about" to="/about" className="hover:text-white">About Us</Link>
          <Link data-testid="landing-footer-services" to="/services" className="hover:text-white">Services</Link>
          <Link data-testid="landing-footer-blog" to="/blog" className="hover:text-white">Blogs</Link>
          <Link data-testid="landing-footer-contact" to="/contact" className="hover:text-white">Contact Us</Link>
          <Link data-testid="landing-footer-sign-in" to="/login" className="rounded-full border border-slate-600 px-4 py-1.5 font-semibold text-white hover:border-slate-400">
            Sign in
          </Link>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="landing-shell flex flex-wrap items-center justify-between gap-3 py-5 text-xs text-slate-400">
          <p>
            RentSlate · Rent, Simplified. Thoughtfully built for small property owners in India 🇮🇳 · © {year}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link data-testid="landing-footer-sitemap" to="/sitemap" className="underline hover:text-white">Sitemap</Link>
            <span aria-hidden="true">|</span>
            <Link data-testid="landing-footer-terms" to="/terms" className="underline hover:text-white">Terms and Conditions</Link>
            <span aria-hidden="true">|</span>
            <Link data-testid="landing-footer-privacy" to="/privacy" className="underline hover:text-white">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
