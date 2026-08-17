import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'
import { readState } from '../lib/readState'
import type { TranslationKey } from '../lib/locales/en'
import { LanguageSelect } from './LanguageSelect'
import VoiceCommandBar from './VoiceCommandBar'
import {
  BarterIcon,
  BellIcon,
  ChatIcon,
  HomeIcon,
  LeafIcon,
  LogoutIcon,
  MarketIcon,
  OrdersIcon,
  ProduceIcon,
  SchemeIcon,
  UserIcon,
  WheatIcon,
} from './icons'
import { cx } from './ui'

interface NavItem {
  to: string
  labelKey: TranslationKey
  Icon: typeof HomeIcon
  /** Shown in the mobile bottom bar (space is limited to five). */
  primary?: boolean
}

const NAV: NavItem[] = [
  { to: '/', labelKey: 'navDashboard', Icon: HomeIcon, primary: true },
  { to: '/market', labelKey: 'navMarket', Icon: MarketIcon, primary: true },
  { to: '/produce', labelKey: 'navProduce', Icon: ProduceIcon, primary: true },
  { to: '/orders', labelKey: 'navOrders', Icon: OrdersIcon },
  { to: '/barter', labelKey: 'navBarter', Icon: BarterIcon },
  { to: '/chat', labelKey: 'navChat', Icon: ChatIcon, primary: true },
  { to: '/crop', labelKey: 'navCrop', Icon: LeafIcon, primary: true },
  { to: '/schemes', labelKey: 'navSchemes', Icon: SchemeIcon },
]

export function Layout() {
  const t = useT()
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [unread, setUnread] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  // Re-check the alert count on every navigation — cheap, and it keeps the
  // badge honest after the user reads or triggers notifications elsewhere.
  useEffect(() => {
    let cancelled = false
    api
      .notifications()
      .then((items) => {
        if (!cancelled) setUnread(readState.countUnread(items))
      })
      .catch(() => {
        if (!cancelled) setUnread(0)
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-page items-center gap-3 px-4 py-1.5">
          <NavLink to="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft text-brand">
              <WheatIcon size={18} />
            </span>
            <span className="hidden text-sm font-semibold tracking-tight text-ink sm:block lg:hidden xl:block">
              {t('appName')}
            </span>
          </NavLink>

          {/* Wraps rather than scrolls: Tamil and Telugu labels run much wider
              than Hindi, and a scrolling nav would hide items with no visible
              affordance. Wrapping grows the header a row and keeps every
              section reachable. min-w-0 stops it widening the page. */}
          <nav className="hidden min-w-0 flex-1 flex-wrap items-center gap-0.5 lg:flex">
            {NAV.map(({ to, labelKey, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cx(
                    'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium transition-colors xl:px-2.5',
                    isActive
                      ? 'bg-brand-soft text-brand-text'
                      : 'text-muted hover:bg-surface hover:text-ink',
                  )
                }
              >
                <Icon size={16} />
                {t(labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <LanguageSelect />

            <NavLink
              to="/notifications"
              aria-label={t('navNotifications')}
              className={({ isActive }) =>
                cx(
                  'relative rounded-md p-2 transition-colors',
                  isActive
                    ? 'bg-brand-soft text-brand-text'
                    : 'text-muted hover:bg-surface hover:text-ink',
                )
              }
            >
              <BellIcon size={18} />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </NavLink>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-md border border-line px-2 py-1.5 text-sm text-ink transition-colors hover:bg-surface"
              >
                <UserIcon size={16} className="text-muted" />
                <span className="hidden max-w-24 truncate sm:block">
                  {user?.name || user?.phone || t('navProfile')}
                </span>
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    role="menu"
                    className="absolute right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lift"
                  >
                    <div className="border-b border-line px-3 py-2">
                      <p className="truncate text-sm font-medium text-ink">
                        {user?.name || t('navProfile')}
                      </p>
                      <p className="truncate text-xs text-muted">{user?.phone}</p>
                    </div>
                    <NavLink
                      to="/profile"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-ink transition-colors hover:bg-surface"
                    >
                      <UserIcon size={15} className="text-muted" />
                      {t('profileTitle')}
                    </NavLink>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void signOut()}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-soft"
                    >
                      <LogoutIcon size={15} />
                      {t('signOut')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Secondary row keeps every section reachable between lg and mobile. */}
        <div className="border-t border-line lg:hidden">
          <nav className="no-scrollbar mx-auto flex max-w-page gap-1 overflow-x-auto px-3 py-1.5">
            {NAV.map(({ to, labelKey, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cx(
                    'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-brand-soft text-brand-text'
                      : 'text-muted hover:bg-surface hover:text-ink',
                  )
                }
              >
                <Icon size={14} />
                {t(labelKey)}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-page flex-1 px-4 py-6 pb-24 sm:py-8 lg:pb-8">
        <Outlet />
      </main>

      <footer className="hidden border-t border-line py-5 lg:block">
        <div className="mx-auto flex max-w-page items-center justify-between px-4 text-xs text-muted">
          <span>{t('appName')}</span>
          <span>{t('appTagline')}</span>
        </div>
      </footer>

      {/* Floating voice command mic — always accessible */}
      <VoiceCommandBar />

      {/* Mobile bottom bar — thumb-reachable for the five most-used sections. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white lg:hidden">
        <div className="mx-auto flex max-w-page">
          {NAV.filter((item) => item.primary).map(({ to, labelKey, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cx(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-brand-text' : 'text-muted',
                )
              }
            >
              <Icon size={19} />
              <span className="max-w-full truncate px-1">{t(labelKey)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
