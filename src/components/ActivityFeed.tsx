import type { ActivityItem } from '../services/dashboard'
import { relativeTime } from '../utils/relativeTime'

const ICONS: Record<ActivityItem['kind'], string> = {
  payment: '💳',
  tenant: '👤',
  revision: '📈',
  bill: '🧾',
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card flex h-40 items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
        No activity yet — payments, tenants, and bills will show up here.
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Recent activity</h3>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <span className="text-lg leading-none" aria-hidden>
              {ICONS[item.kind]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-700 dark:text-slate-300">{item.description}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{relativeTime(item.at)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
