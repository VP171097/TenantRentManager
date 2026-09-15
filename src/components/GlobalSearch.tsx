import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { globalSearch, type SearchResult } from '../services/search'
import { Search, X, Building2, Users, DoorOpen, Receipt } from 'lucide-react'

const TYPE_LABEL: Record<SearchResult['type'], string> = {
  tenant: 'Tenants',
  room: 'Rooms',
  property: 'Properties',
  receipt: 'Receipts',
}

const TYPE_ICON: Record<SearchResult['type'], React.ElementType> = {
  tenant: Users,
  room: DoorOpen,
  property: Building2,
  receipt: Receipt,
}

export function GlobalSearch({ className = '' }: { className?: string }) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Ctrl+K / Cmd+K shortcut to focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const q = term.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(() => {
      globalSearch(q)
        .then((r) => setResults(r))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [term])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleSelect(result: SearchResult) {
    setOpen(false)
    setTerm('')
    navigate(result.to)
  }

  function clearSearch() {
    setTerm('')
    setResults([])
    inputRef.current?.focus()
  }

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    ;(acc[r.type] ??= []).push(r)
    return acc
  }, {})

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          value={term}
          onChange={(e) => { setTerm(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search…"
          className="input py-2 pl-9 pr-20 text-sm"
          aria-label="Global search"
        />
        {/* Keyboard shortcut hint */}
        {!term && (
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 sm:flex items-center gap-0.5">
            <span>⌘</span><span>K</span>
          </kbd>
        )}
        {/* Clear button */}
        {term && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
            aria-label="Clear search"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {open && term.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl slide-down">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
              Searching…
            </div>
          )}
          {!loading && results.length === 0 && (
            <p className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              No results for "<strong>{term}</strong>"
            </p>
          )}
          {!loading && (Object.keys(grouped) as SearchResult['type'][]).map((type) => {
            const IconComp = TYPE_ICON[type]
            return (
              <div key={type}>
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <IconComp size={12} className="text-slate-400 dark:text-slate-500" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {TYPE_LABEL[type]}
                  </p>
                  <span className="ml-auto text-[10px] font-semibold text-slate-300 dark:text-slate-600">
                    {grouped[type].length}
                  </span>
                </div>
                {grouped[type].map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => handleSelect(r)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                      <IconComp size={13} className="text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{r.label}</span>
                      {r.sublabel && (
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{r.sublabel}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
