import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Receipt, User } from 'lucide-react'
import { Footer } from '../components/Footer'
import { UserMenu } from '../components/UserMenu'
import { Building2 } from 'lucide-react'

type MobileNavItem = { to: string; label: string; icon: React.ReactNode }

const NAV: MobileNavItem[] = [
  { to: '/tenant/dashboard', label: 'Home', icon: <LayoutDashboard size={20} /> },
  { to: '/tenant/ledger', label: 'Ledger', icon: <BookOpen size={20} /> },
  { to: '/tenant/receipts', label: 'Receipts', icon: <Receipt size={20} /> },
  { to: '/tenant/profile', label: 'Profile', icon: <User size={20} /> },
]

const USER_MENU_LINKS = [{ to: '/tenant/profile', label: 'My Profile', icon: '👤' }]

export function TenantLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-sm">
            <Building2 size={16} className="text-white" />
          </div>
          <p className="text-lg font-extrabold tracking-tight text-brand-700 dark:text-brand-200">RentBook</p>
        </div>
        <UserMenu links={USER_MENU_LINKS} />
      </header>

      <main className="mx-auto flex max-w-2xl flex-col px-4 py-6">
        <div key={location.pathname} className="page-fade-in">
          <Outlet />
        </div>
        <Footer className="mt-10" />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-all ${
                isActive ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${isActive ? 'bg-brand-100 dark:bg-brand-950' : ''}`}>
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
