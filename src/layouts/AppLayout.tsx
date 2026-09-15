import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  FileText,
  CreditCard,
  BookOpen,
  Receipt,
  TrendingUp,
  Wallet,
  Wrench,
  UserCog,
  Settings,
  User,
  ChevronRight,
  History,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { GlobalSearch } from '../components/GlobalSearch'
import { Footer } from '../components/Footer'
import { UserMenu } from '../components/UserMenu'

const USER_MENU_LINKS = [
  { to: '/profile', label: 'My Profile', icon: '👤' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

type NavItem = { to: string; label: string; icon: React.ReactNode }
type NavSection = { heading: string; items: NavItem[] }

const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> }],
  },
  {
    heading: 'Property',
    items: [
      { to: '/properties', label: 'Properties', icon: <Building2 size={18} /> },
      { to: '/rooms', label: 'Rooms', icon: <DoorOpen size={18} /> },
      { to: '/tenants', label: 'Tenants', icon: <Users size={18} /> },
    ],
  },
  {
    heading: 'Money',
    items: [
      { to: '/billing', label: 'Billing', icon: <FileText size={18} /> },
      { to: '/payments', label: 'Payments', icon: <CreditCard size={18} /> },
      { to: '/ledger', label: 'Ledger', icon: <BookOpen size={18} /> },
      { to: '/receipts', label: 'Receipts', icon: <Receipt size={18} /> },
      { to: '/expenses', label: 'Expenses', icon: <Wallet size={18} /> },
      { to: '/reports', label: 'Reports', icon: <TrendingUp size={18} /> },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { to: '/maintenance', label: 'Maintenance', icon: <Wrench size={18} /> },
      { to: '/managers', label: 'Managers', icon: <UserCog size={18} /> },
      { to: '/audit', label: 'Audit Logs', icon: <History size={18} /> },
    ],
  },
  {
    heading: 'Account',
    items: [{ to: '/settings', label: 'Settings', icon: <Settings size={18} /> }],
  },
]

type MobileNavItem = { to: string; label: string; icon: React.ReactNode }
const MOBILE_NAV: MobileNavItem[] = [
  { to: '/dashboard', label: 'Home', icon: <LayoutDashboard size={20} /> },
  { to: '/tenants', label: 'Tenants', icon: <Users size={20} /> },
  { to: '/payments', label: 'Payments', icon: <CreditCard size={20} /> },
  { to: '/ledger', label: 'Ledger', icon: <BookOpen size={20} /> },
]

function BrandMark({ profile }: { profile: { logo_url?: string | null; full_name?: string } | null }) {
  if (profile?.logo_url) {
    return <img src={profile.logo_url} alt="RentBook" className="h-9 w-auto max-w-[9rem] object-contain" />
  }
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-sm">
        <Building2 size={16} className="text-white" />
      </div>
      <p className="text-xl font-extrabold tracking-tight text-brand-700 dark:text-brand-200">RentBook</p>
    </div>
  )
}

function SidebarUserFooter({ profile }: { profile: { full_name?: string; role?: string; email?: string | null } | null }) {
  if (!profile) return null
  const initials = (profile.full_name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  const roleColor =
    profile.role === 'owner'
      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
  return (
    <div className="border-t border-slate-200 dark:border-slate-800 px-3 py-3">
      <NavLink
        to="/profile"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{profile.full_name}</p>
          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${roleColor}`}>
            {profile.role}
          </span>
        </div>
        <User size={14} className="text-slate-400" />
      </NavLink>
    </div>
  )
}

export function AppLayout() {
  const { profile } = useAuth()
  const location = useLocation()
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  useLockBodyScroll(showMoreMenu)

  // Close the mobile "More" drawer whenever the route changes (tapping a
  // link inside it navigates, which should also close it).
  useEffect(() => {
    setShowMoreMenu(false)
  }, [location.pathname])

  const visibleNavSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !(['/managers', '/audit'].includes(item.to) && profile?.role !== 'owner')),
  }))

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 md:flex">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:sticky md:top-0 md:h-screen md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-slate-200 dark:md:border-slate-800 md:bg-white dark:md:bg-slate-900">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800">
          <BrandMark profile={profile} />
          <GlobalSearch className="mt-4" />
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {visibleNavSections.map((section) => (
            <div key={section.heading}>
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {section.heading}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    data-testid={`sidebar-nav-${item.to.slice(1)}`}
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`transition-colors ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                          {item.icon}
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {isActive && <ChevronRight size={14} className="text-brand-500 dark:text-brand-400" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar user footer */}
        <SidebarUserFooter profile={profile} />
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 pb-24 md:pb-0 min-w-0">
        {/* Desktop top bar */}
        <header className="sticky top-0 z-10 hidden items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/85 dark:bg-slate-900/80 backdrop-blur-md px-7 py-3 md:flex">
          <p data-testid="app-header-context" className="text-xs text-slate-600 dark:text-slate-300">Your workspace <span className="mx-2 text-slate-300">/</span><span className="capitalize">{location.pathname.split('/')[1]}</span></p>
          <UserMenu links={USER_MENU_LINKS} />
        </header>

        {/* Mobile header */}
        <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-3 md:hidden">
          <div className="flex items-center justify-between">
            <BrandMark profile={profile} />
            <UserMenu links={USER_MENU_LINKS} />
          </div>
          <GlobalSearch className="mt-3" />
        </header>

        <main className="mx-auto flex max-w-7xl flex-col px-4 py-7 lg:px-7">
          <div key={location.pathname} className="page-fade-in">
            <Outlet />
          </div>
          <Footer className="mt-10" />
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md md:hidden">
        {MOBILE_NAV.map((item) => (
          <NavLink
            data-testid={`mobile-nav-${item.to.slice(1)}`}
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
        <button
          data-testid="mobile-more-open"
          onClick={() => setShowMoreMenu((s) => !s)}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-all ${
            showMoreMenu ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${showMoreMenu ? 'bg-brand-100 dark:bg-brand-950' : ''}`}>
            <Menu size={20} />
          </span>
          More
        </button>
      </nav>

      {/* ── Mobile "More" drawer — every page the bottom nav has no room
          for (Properties, Rooms, Billing, Receipts, Expenses, Reports,
          Maintenance, Managers, Audit Logs, Settings). Mirrors the
          desktop sidebar's NAV_SECTIONS so nothing is reachable on
          desktop but hidden on mobile. ── */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMoreMenu(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-slate-900 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4">
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">More</p>
              <button data-testid="mobile-more-close" aria-label="Close navigation" onClick={() => setShowMoreMenu(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-4 px-3 py-4">
              {visibleNavSections.map((section) => (
                <div key={section.heading}>
                  <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {section.heading}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <NavLink
                        data-testid={`mobile-more-nav-${item.to.slice(1)}`}
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                              : 'text-slate-600 dark:text-slate-400'
                          }`
                        }
                      >
                        <span className="text-slate-400 dark:text-slate-500">{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}
