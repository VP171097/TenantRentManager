export function Footer({ className = '' }: { className?: string }) {
  const year = new Date().getFullYear()
  return (
    <footer className={`border-t border-slate-200 pt-4 pb-2 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500 ${className}`}>
      <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:justify-between sm:text-left">
        <p>
          © {year} <span className="font-semibold text-slate-500 dark:text-slate-400">RentBook</span> — Rent,
          Simplified.
        </p>
        <p className="text-xs">Made for small property owners in India 🇮🇳</p>
      </div>
    </footer>
  )
}
