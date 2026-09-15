export function CollectionRing({ percent, id }: { percent: number; id: string }) {
  const value = Math.min(100, Math.max(0, percent))
  return <div data-testid={`${id}-ring`} className="relative h-32 w-32 shrink-0" role="img" aria-label={`${value}% of billed amount collected`}>
    <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" opacity="0.15" strokeWidth="7" /><circle cx="60" cy="60" r="50" fill="none" stroke="#f4c674" strokeWidth="7" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - value} className="collection-ring" /></svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center"><span data-testid={`${id}-percent`} className="font-mono text-3xl font-medium">{value}%</span><span data-testid={`${id}-caption`} className="mt-1 text-[10px] uppercase tracking-widest opacity-80">collected</span></div>
  </div>
}