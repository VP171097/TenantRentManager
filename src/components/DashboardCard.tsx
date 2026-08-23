import clsx from 'clsx'
import type { ReactNode } from 'react'

interface DashboardCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  tone?: 'default' | 'good' | 'warn' | 'bad'
}

const TONES: Record<string, string> = {
  default: 'text-slate-900',
  good: 'text-green-600',
  warn: 'text-orange-600',
  bad: 'text-red-600',
}

export function DashboardCard({ label, value, icon, tone = 'default' }: DashboardCardProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon}
      </div>
      <p className={clsx('mt-2 text-2xl font-bold', TONES[tone])}>{value}</p>
    </div>
  )
}
