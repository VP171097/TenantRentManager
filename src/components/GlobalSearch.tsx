import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { globalSearch, type SearchResult } from '../services/search'

const TYPE_LABEL: Record<SearchResult['type'], string> = {
  tenant: 'Tenants',
  room: 'Rooms',
  property: 'Properties',
  receipt: 'Receipts',
}

export function GlobalSearch({ className = '' }: { className?: string }) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

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

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    ;(acc[r.type] ??= []).push(r)
    return acc
  }, {})

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="search"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search tenants, rooms, properties, receipts…"
        className="input py-2"
      />
      {open && term.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          {loading && <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Searching…</p>}
          {!loading && results.length === 0 && <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">No results.</p>}
          {!loading &&
            (Object.keys(grouped) as SearchResult['type'][]).map((type) => (
              <div key={type}>
                <p className="px-4 pt-2 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{TYPE_LABEL[type]}</p>
                {grouped[type].map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => handleSelect(r)}
                    className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <span className="font-medium text-slate-900 dark:text-slate-100">{r.label}</span>
                    {r.sublabel && <span className="text-xs text-slate-500 dark:text-slate-400">{r.sublabel}</span>}
                  </button>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
