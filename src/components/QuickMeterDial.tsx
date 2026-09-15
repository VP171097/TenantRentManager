import { Minus, Plus, Zap } from 'lucide-react'
import { formatINR } from '../utils/money'
import { meterPreview } from '../utils/meter'

interface QuickMeterDialProps {
  id: string
  previous: number
  current: number | ''
  rate: number
  onChange: (value: number | '') => void
  reset?: boolean
  deferred?: boolean
  disabled?: boolean
}

/** Only a local preview. No writes until the parent form explicitly submits. */
export function QuickMeterDial({ id, previous, current, rate, onChange, reset = false, deferred = false, disabled = false }: QuickMeterDialProps) {
  const preview = meterPreview(previous, current, rate, reset, deferred)
  const floor = reset ? 0 : previous
  const maximum = Math.max(floor + 1000, typeof current === 'number' ? current : floor)
  const step = (delta: number) => onChange(Math.max(floor, Math.round(((current === '' ? floor : current) + delta) * 100) / 100))
  return (
    <section data-testid={`${id}-dial`} aria-label="Quick meter dial" className="rounded-2xl border border-brand-700/15 bg-brand-50/50 dark:bg-brand-950/30 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span data-testid={`${id}-heading`} className="eyebrow flex items-center gap-2 text-brand-800 dark:text-brand-200"><Zap size={15} /> Quick meter dial</span>
        <span data-testid={`${id}-rate`} className="text-xs text-slate-600 dark:text-slate-300">{formatINR(rate)} / unit</span>
      </div>
      <p data-testid={`${id}-previous`} className="mt-3 text-xs text-slate-600 dark:text-slate-300">{reset ? 'Replaced meter · starting from 0' : `Last charged reading: ${previous.toLocaleString('en-IN')}`}</p>
      <label data-testid={`${id}-label`} htmlFor={`${id}-current`} className="mt-4 block text-sm font-medium">Current meter reading</label>
      <div className="mt-2 flex items-center gap-2">
        <button data-testid={`${id}-decrease`} type="button" aria-label="Decrease reading by one" disabled={disabled || (current !== '' && current <= floor)} className="btn-secondary !px-3" onClick={() => step(-1)}><Minus size={16} /></button>
        <input data-testid={`${id}-current`} id={`${id}-current`} className="input min-w-0 text-center font-mono text-xl" type="number" step="0.01" min={floor} required value={current} disabled={disabled} inputMode="decimal" placeholder="Enter reading" onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} aria-invalid={current !== '' && !preview.valid} aria-describedby={`${id}-help`} />
        <button data-testid={`${id}-increase`} type="button" aria-label="Increase reading by one" disabled={disabled} className="btn-secondary !px-3" onClick={() => step(1)}><Plus size={16} /></button>
      </div>
      <input data-testid={`${id}-slider`} aria-label="Adjust current meter reading" aria-valuetext={current === '' ? 'No reading entered' : `${current} meter reading, ${preview.units} units`} className="meter-range mt-2" type="range" min={floor} max={maximum} step="0.01" disabled={disabled} value={current === '' ? floor : Math.max(floor, current)} onChange={e => onChange(Number(e.target.value))} />
      <p id={`${id}-help`} data-testid={`${id}-help`} className={`text-xs ${current !== '' && !preview.valid ? 'text-red-700 dark:text-red-300' : 'text-slate-600 dark:text-slate-300'}`}>{current !== '' && !preview.valid ? 'Reading must be at least the previous reading. Use meter-reset settings if replaced.' : 'Drag to adjust, or type the exact number on your meter.'}</p>
      <div data-testid={`${id}-result`} aria-live="polite" aria-atomic="true" className="mt-4 flex items-end justify-between gap-2 border-t border-brand-700/15 pt-4">
        <div><p data-testid={`${id}-units-label`} className="text-xs text-slate-600 dark:text-slate-300">Units used</p><p data-testid={`${id}-units`} className="mt-1 font-mono text-xl">{preview.valid ? preview.units.toLocaleString('en-IN') : '—'}</p></div>
        <div className="text-right"><p data-testid={`${id}-charge-label`} className="text-xs text-slate-600 dark:text-slate-300">{deferred ? 'Charge deferred' : 'Electricity estimate'}</p><p data-testid={`${id}-amount`} className="mt-1 font-mono text-xl font-semibold text-brand-800 dark:text-brand-200">{preview.valid ? formatINR(preview.amount) : '—'}</p></div>
      </div>
    </section>
  )
}