import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const OWNER_NAV = [
  { to: '/dashboard', label: 'Home', icon: '🏠' },
  { to: '/properties', label: 'Properties', icon: '🏢' },
  { to: '/tenants', label: 'Tenants', icon: '👥' },
  { to: '/billing', label: 'Billing', icon: '🧾' },
  { to: '/payments', label: 'Payments', icon: '💳' },
  { to: '/ledger', label: 'Ledger', icon: '📒' },
  { to: '/receipts', label: 'Receipts', icon: '🧻' },
  { to: '/reports', label: 'Reports', icon: '📊' },
  { to: '/managers', label: 'Managers', icon: '🧑‍💼' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

const MOBILE_NAV = [
  { to: '/dashboard', label: 'Home', icon: '🏠' },
  { to: '/tenants', label: 'Tenants', icon: '👥' },
  { to: '/payments', label: 'Payments', icon: '💳' },
  { to: '/ledger', label: 'Ledger', icon: '📒' },
  { to: '/settings', label: 'More', icon: '☰' },
]

export function AppLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-slate-200 md:bg-white">
        <div className="px-6 py-5">
          <p className="text-xl font-extrabold text-brand-700">Room Rent Manager</p>
          {profile && <p className="mt-1 text-sm text-slate-500">{profile.full_name}</p>}
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {OWNER_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3">
          <button
            onClick={handleSignOut}
            className="w-full rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 pb-24 md:pb-0">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <p className="text-lg font-extrabold text-brand-700">Room Rent Manager</p>
          <button onClick={handleSignOut} className="text-sm font-semibold text-slate-600">
            Sign out
          </button>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-slate-200 bg-white md:hidden">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold ${
                isActive ? 'text-brand-700' : 'text-slate-500'
              }`
            }
          >
            <span className="text-xl" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
