import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'
import { readState } from '../lib/readState'
import type { TranslationKey } from '../lib/locales/en'
import { LanguageSelect } from './LanguageSelect'
import { MagicButton } from './MagicButton'
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
    <div className="flex min-h-screen flex-col bg-transparent text-ink">
      <header className="sticky top-0 z-40 border-b border-leaf/25 bg-cream/90 backdrop-blur-md shadow-xs transition-colors">
        <div className="mx-auto flex min-h-14 max-w-page items-center gap-3 px-4 py-2">
          <NavLink to="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-forest to-[#0d5d10] text-cream shadow-xs ring-1 ring-leaf/40 transition-transform group-hover:scale-105">
              <WheatIcon size={20} />
            </span>
            <div className="hidden sm:block lg:hidden xl:block">
              <span className="block text-base font-bold tracking-tight text-forest leading-tight">
                {t('appName')}
              </span>
              <span className="block text-[10px] font-medium tracking-wide text-muted -mt-0.5">
                AgriTech AI Platform
              </span>
            </div>
          </NavLink>

          {/* Wraps rather than scrolls: Tamil and Telugu labels run much wider
              than Hindi, and a scrolling nav would hide items with no visible
              affordance. Wrapping grows the header a row and keeps every
              section reachable. min-w-0 stops it widening the page. */}
          <nav className="hidden min-w-0 flex-1 flex-wrap items-center gap-1 lg:flex ml-2">
            {NAV.map(({ to, labelKey, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cx(
                    'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-forest text-cream font-semibold shadow-xs'
                      : 'text-forest/75 hover:bg-leafSoft hover:text-forest',
                  )
                }
              >
                <Icon size={16} />
                {t(labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            <LanguageSelect />

            <NavLink
              to="/notifications"
              aria-label={t('navNotifications')}
              className={({ isActive }) =>
                cx(
                  'relative rounded-xl p-2 transition-all duration-150',
                  isActive
                    ? 'bg-forest text-cream shadow-xs'
                    : 'text-muted hover:bg-leafSoft hover:text-forest',
                )
              }
            >
              <BellIcon size={18} />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white shadow-xs">
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
                className="flex items-center gap-2 rounded-xl border border-leaf/30 bg-white/90 px-2.5 py-1.5 text-sm font-medium text-forest shadow-2xs transition-all hover:bg-creamSoft hover:border-leaf"
              >
                <UserIcon size={16} className="text-forest/70" />
                <span className="hidden max-w-28 truncate sm:block">
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
                    className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-leaf/30 bg-white/95 p-1.5 shadow-lift backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="border-b border-line/70 px-3.5 py-2.5">
                      <p className="truncate text-sm font-semibold text-ink">
                        {user?.name || t('navProfile')}
                      </p>
                      <p className="truncate text-xs text-muted">{user?.phone}</p>
                    </div>
                    <NavLink
                      to="/profile"
                      role="menuitem"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink transition-colors hover:bg-leafSoft hover:text-forest"
                    >
                      <UserIcon size={15} className="text-forest/70" />
                      {t('profileTitle')}
                    </NavLink>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void signOut()}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-soft"
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
        <div className="border-t border-leaf/15 lg:hidden">
          <nav className="no-scrollbar mx-auto flex max-w-page gap-1 overflow-x-auto px-3 py-1.5">
            {NAV.map(({ to, labelKey, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cx(
                    'flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-forest text-cream font-semibold shadow-xs'
                      : 'text-muted hover:bg-leafSoft hover:text-forest',
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

      {/* Central Floating Magic AI Action Button */}
      <MagicButton />

      <footer className="hidden border-t border-leaf/20 py-6 lg:block bg-creamSoft/30">
        <div className="mx-auto flex max-w-page items-center justify-between px-4 text-xs text-muted">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-forest text-cream text-[10px]">
              🌾
            </span>
            <span className="font-semibold text-forest">{t('appName')}</span>
            <span>—</span>
            <span>{t('appTagline')}</span>
          </div>
          <span className="text-forest/60 font-medium">Digital Agriculture & AI Marketplace</span>
        </div>
      </footer>

      {/* Mobile bottom bar — thumb-reachable for the five most-used sections. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-leaf/20 bg-cream/95 backdrop-blur-lg shadow-lift lg:hidden">
        <div className="mx-auto flex max-w-page">
          {NAV.filter((item) => item.primary).map(({ to, labelKey, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cx(
                  'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-forest font-bold' : 'text-muted hover:text-forest',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={19} />
                  <span className="max-w-full truncate px-1">{t(labelKey)}</span>
                  <span
                    className={cx(
                      'h-1 w-1 rounded-full transition-all',
                      isActive ? 'bg-forest scale-100' : 'bg-transparent scale-0',
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
