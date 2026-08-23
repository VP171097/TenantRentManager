import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { to: '/tenant/dashboard', label: 'Home', icon: '🏠' },
  { to: '/tenant/ledger', label: 'Ledger', icon: '📒' },
  { to: '/tenant/receipts', label: 'Receipts', icon: '🧻' },
  { to: '/tenant/profile', label: 'Profile', icon: '👤' },
]

export function TenantLayout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <p className="text-lg font-extrabold text-brand-700">My Rent</p>
        <button onClick={handleSignOut} className="text-sm font-semibold text-slate-600">
          Sign out
        </button>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-slate-200 bg-white">
        {NAV.map((item) => (
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
