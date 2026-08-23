import { Link } from 'react-router-dom'

export function SettingsPage() {
  const links = [
    { to: '/profile', label: 'My Profile', icon: '👤' },
    { to: '/managers', label: 'Managers', icon: '🧑‍💼' },
    { to: '/reports', label: 'Reports', icon: '📊' },
    { to: '/properties', label: 'Properties', icon: '🏢' },
    { to: '/rooms', label: 'Rooms', icon: '🚪' },
  ]
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="card flex flex-col items-center gap-2 text-center hover:shadow-md">
            <span className="text-2xl" aria-hidden>
              {l.icon}
            </span>
            <span className="font-semibold text-slate-700">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
