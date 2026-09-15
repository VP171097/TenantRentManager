import type { ActivityItem } from '../services/dashboard'
import { relativeTime } from '../utils/relativeTime'
import { CreditCard, User, TrendingUp, FileText } from 'lucide-react'

const KIND_CONFIG: Record<
  ActivityItem['kind'],
  { Icon: React.ElementType; bg: string; text: string }
> = {
  payment:  { Icon: CreditCard,  bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400' },
  tenant:   { Icon: User,        bg: 'bg-sky-100 dark:bg-sky-900/40',         text: 'text-sky-600 dark:text-sky-400' },
  revision: { Icon: TrendingUp,  bg: 'bg-violet-100 dark:bg-violet-900/40',   text: 'text-violet-600 dark:text-violet-400' },
  bill:     { Icon: FileText,    bg: 'bg-amber-100 dark:bg-amber-900/40',     text: 'text-amber-600 dark:text-amber-400' },
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card flex h-40 items-center justify-center text-center text-sm text-slate-400 dark:text-slate-500">
        No activity yet — payments, tenants, and bills will show up here.
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recent Activity</h3>
      <ul className="space-y-0">
        {items.map((item, index) => {
          const { Icon, bg, text } = KIND_CONFIG[item.kind]
          const isLast = index === items.length - 1
          return (
            <li key={item.id} className="flex items-start gap-3">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg}`}>
                  <Icon size={14} className={text} />
                </div>
                {!isLast && <div className="mt-1 w-px flex-1 bg-slate-100 dark:bg-slate-800" style={{ minHeight: 20 }} />}
              </div>
              {/* Content */}
              <div className={`min-w-0 flex-1 ${!isLast ? 'pb-4' : ''}`}>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{item.description}</p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{relativeTime(item.at)}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
