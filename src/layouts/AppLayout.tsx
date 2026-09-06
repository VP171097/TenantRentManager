import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
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
  { to: '/expenses', label: 'Expenses', icon: '💸' },
  { to: '/maintenance', label: 'Maintenance', icon: '🔧' },
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

function BrandMark({ profile }: { profile: { logo_url?: string | null; full_name?: string } | null }) {
  if (profile?.logo_url) {
    return <img src={profile.logo_url} alt="Room Rent Manager" className="h-9 w-auto max-w-[9rem] object-contain" />
  }
  return <p className="text-xl font-extrabold text-brand-700 dark:text-brand-200">Room Rent Manager</p>
}

export function AppLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-slate-200 dark:md:border-slate-800 md:bg-white dark:md:bg-slate-900">
        <div className="px-6 py-5">
          <BrandMark profile={profile} />
          {profile && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.full_name}</p>}
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {OWNER_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
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
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 py-3 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 pb-24 md:pb-0">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 md:hidden">
          <BrandMark profile={profile} />
          <button onClick={handleSignOut} className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Sign out
          </button>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">
          <div key={location.pathname} className="page-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 md:hidden">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold transition-colors ${
                isActive ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'
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
