export function Sparkline({ values, id, label }: { values: number[]; id: string; label: string }) {
  if (values.length < 2) return <span data-testid={`${id}-no-trend`} className="text-xs text-slate-500">Awaiting history</span>
  const maximum = Math.max(...values, 1)
  const points = values.map((v, i) => `${i * 100 / (values.length - 1)},${32 - v / maximum * 28}`).join(' ')
  return <svg data-testid={`${id}-sparkline`} viewBox="0 0 104 36" className="h-9 w-24 text-brand-700 dark:text-brand-300" role="img" aria-label={label}><title>{label}: {values.join(', ')}</title><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}