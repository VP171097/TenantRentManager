import { Link } from 'react-router-dom'
import { useTheme, type ThemePreference } from '../hooks/useTheme'

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '🖥️' },
]

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const links = [
    { to: '/profile', label: 'My Profile', icon: '👤' },
    { to: '/managers', label: 'Managers', icon: '🧑‍💼' },
    { to: '/reports', label: 'Reports', icon: '📊' },
    { to: '/properties', label: 'Properties', icon: '🏢' },
    { to: '/rooms', label: 'Rooms', icon: '🚪' },
  ]
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Settings</h1>

      <div className="card">
        <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Appearance</h2>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm font-semibold transition active:scale-95 ${
                theme === opt.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950 dark:text-brand-200'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <span className="text-xl" aria-hidden>
                {opt.icon}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          "System" follows your device's light/dark setting automatically.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="card flex flex-col items-center gap-2 text-center transition-shadow hover:shadow-md active:scale-95"
          >
            <span className="text-2xl" aria-hidden>
              {l.icon}
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
