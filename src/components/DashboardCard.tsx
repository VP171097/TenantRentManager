import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCountUp } from '../hooks/useCountUp'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface DashboardCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  tone?: 'default' | 'good' | 'warn' | 'bad'
  countTo?: number
  format?: (n: number) => string
  /** Optional delta text shown below the value, e.g. "+12% vs last month" */
  delta?: string
  deltaPositive?: boolean
  /** When set, the whole card links to this route (e.g. "/properties"). */
  to?: string
}

const VALUE_TONES: Record<string, string> = {
  default: 'text-slate-900 dark:text-slate-100',
  good:    'text-emerald-600 dark:text-emerald-400',
  warn:    'text-orange-600 dark:text-orange-400',
  bad:     'text-red-600 dark:text-red-400',
}

const ICON_BG: Record<string, string> = {
  default: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  good:    'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
  warn:    'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
  bad:     'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
}

const TOP_BORDER: Record<string, string> = {
  default: 'border-t-2 border-t-slate-200 dark:border-t-slate-700',
  good:    'border-t-2 border-t-emerald-400 dark:border-t-emerald-500',
  warn:    'border-t-2 border-t-orange-400 dark:border-t-orange-500',
  bad:     'border-t-2 border-t-red-400 dark:border-t-red-500',
}

export function DashboardCard({
  label,
  value,
  icon,
  tone = 'default',
  countTo,
  format,
  delta,
  deltaPositive,
  to,
}: DashboardCardProps) {
  const animated = useCountUp(countTo ?? 0)
  const display = countTo === undefined ? value : format ? format(animated) : Math.round(animated)

  const DeltaIcon = deltaPositive === true ? TrendingUp : deltaPositive === false ? TrendingDown : Minus

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-snug">{label}</p>
        {icon && (
          <div className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', ICON_BG[tone])}>
            {icon}
          </div>
        )}
      </div>
      <p className={clsx('mt-2 text-2xl font-bold tracking-tight', VALUE_TONES[tone])}>{display}</p>
      {delta && (
        <div className={clsx('mt-1.5 flex items-center gap-1 text-xs font-medium',
          deltaPositive === true ? 'text-emerald-600 dark:text-emerald-400'
          : deltaPositive === false ? 'text-red-500 dark:text-red-400'
          : 'text-slate-400 dark:text-slate-500',
        )}>
          <DeltaIcon size={12} />
          <span>{delta}</span>
        </div>
      )}
    </>
  )

  const className = clsx(
    'block rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-100 dark:border-slate-800',
    'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
    to ? 'cursor-pointer' : 'cursor-default',
    TOP_BORDER[tone],
  )

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}
