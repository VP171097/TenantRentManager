import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useCountUp } from '../hooks/useCountUp'

interface DashboardCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  tone?: 'default' | 'good' | 'warn' | 'bad'
  /** When given, animates from 0 up to this number on first render instead
   * of showing `value` immediately — used for the dashboard's big stat
   * cards. `value` is still what's displayed once the animation settles
   * (or immediately, if the value isn't purely numeric), via `format`. */
  countTo?: number
  format?: (n: number) => string
}

const TONES: Record<string, string> = {
  default: 'text-slate-900 dark:text-slate-100',
  good: 'text-green-600 dark:text-green-400',
  warn: 'text-orange-600 dark:text-orange-400',
  bad: 'text-red-600 dark:text-red-400',
}

export function DashboardCard({ label, value, icon, tone = 'default', countTo, format }: DashboardCardProps) {
  const animated = useCountUp(countTo ?? 0)
  const display = countTo === undefined ? value : format ? format(animated) : Math.round(animated)

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm border border-slate-100 dark:border-slate-700 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {icon}
      </div>
      <p className={clsx('mt-2 text-2xl font-bold', TONES[tone])}>{display}</p>
    </div>
  )
}
