import { Link } from 'react-router-dom'
import { useTheme, type ThemePreference } from '../hooks/useTheme'
import { Sun, Moon, Monitor, Building2, Users, TrendingUp, DoorOpen, UserCog, Check } from 'lucide-react'

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'light',  label: 'Light',  icon: Sun,     description: 'Always light' },
  { value: 'dark',   label: 'Dark',   icon: Moon,    description: 'Always dark' },
  { value: 'system', label: 'System', icon: Monitor,  description: 'Follow OS' },
]

const QUICK_LINKS = [
  { to: '/profile',    label: 'My Profile', icon: Users,     color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  { to: '/managers',   label: 'Managers',   icon: UserCog,   color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400' },
  { to: '/reports',    label: 'Reports',    icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { to: '/properties', label: 'Properties', icon: Building2,  color: 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400' },
  { to: '/rooms',      label: 'Rooms',      icon: DoorOpen,  color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
]

export function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="max-w-lg space-y-8 page-fade-in">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Settings</h1>

      {/* Appearance */}
      <div className="card space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Appearance</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Choose how RentSlate looks on your device.</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const isActive = theme === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`relative flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm font-semibold transition-all active:scale-95 ${
                  isActive
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950/60 dark:text-brand-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {isActive && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600">
                    <Check size={10} className="text-white" />
                  </span>
                )}
                <Icon size={22} className={isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'} />
                {opt.label}
                <span className="text-xs font-normal opacity-70">{opt.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Quick navigation */}
      <div>
        <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-slate-100">Quick Navigation</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map((l) => {
            const Icon = l.icon
            return (
              <Link
                key={l.to}
                to={l.to}
                className="group card flex flex-col items-center gap-3 py-5 text-center hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.97]"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${l.color}`}>
                  <Icon size={20} />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{l.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
