import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { GlobalSearch } from '../components/GlobalSearch'
import { Footer } from '../components/Footer'
import { UserMenu } from '../components/UserMenu'

const USER_MENU_LINKS = [
  { to: '/profile', label: 'My Profile', icon: '👤' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

const NAV_SECTIONS: { heading: string; items: { to: string; label: string; icon: string }[] }[] = [
  {
    heading: 'Overview',
    items: [{ to: '/dashboard', label: 'Home', icon: '🏠' }],
  },
  {
    heading: 'Property',
    items: [
      { to: '/properties', label: 'Properties', icon: '🏢' },
      { to: '/tenants', label: 'Tenants', icon: '👥' },
    ],
  },
  {
    heading: 'Money',
    items: [
      { to: '/billing', label: 'Billing', icon: '🧾' },
      { to: '/payments', label: 'Payments', icon: '💳' },
      { to: '/ledger', label: 'Ledger', icon: '📒' },
      { to: '/receipts', label: 'Receipts', icon: '🧻' },
      { to: '/expenses', label: 'Expenses', icon: '💸' },
      { to: '/reports', label: 'Reports', icon: '📊' },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { to: '/maintenance', label: 'Maintenance', icon: '🔧' },
      { to: '/managers', label: 'Managers', icon: '🧑‍💼' },
    ],
  },
  {
    heading: 'Account',
    items: [{ to: '/settings', label: 'Settings', icon: '⚙️' }],
  },
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
    return <img src={profile.logo_url} alt="RentBook" className="h-9 w-auto max-w-[9rem] object-contain" />
  }
  return <p className="text-xl font-extrabold text-brand-700 dark:text-brand-200">RentBook</p>
}

export function AppLayout() {
  const { profile } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-slate-200 dark:md:border-slate-800 md:bg-white dark:md:bg-slate-900">
        <div className="px-6 py-5">
          <BrandMark profile={profile} />
          {profile && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.full_name}</p>}
          <GlobalSearch className="mt-4" />
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading}>
              <p className="px-4 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.heading}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
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
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 pb-24 md:pb-0">
        {/* Desktop top bar: user menu, top right */}
        <header className="sticky top-0 z-10 hidden items-center justify-end border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 md:flex">
          <UserMenu links={USER_MENU_LINKS} />
        </header>

        {/* Mobile header */}
        <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 md:hidden">
          <div className="flex items-center justify-between">
            <BrandMark profile={profile} />
            <UserMenu links={USER_MENU_LINKS} />
          </div>
          <GlobalSearch className="mt-3" />
        </header>
        <main className="mx-auto flex max-w-6xl flex-col px-4 py-6">
          <div key={location.pathname} className="page-fade-in">
            <Outlet />
          </div>
          <Footer className="mt-10" />
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
