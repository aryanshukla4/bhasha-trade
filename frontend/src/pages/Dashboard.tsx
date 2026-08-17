import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarterIcon,
  ChatIcon,
  LeafIcon,
  LocationIcon,
  MarketIcon,
  PlusIcon,
  SunIcon,
} from '../components/icons'
import { Button, Card, EmptyState, Section, Spinner, cx } from '../components/ui'
import { MagicButton } from '../components/MagicButton'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { money } from '../lib/format'
import { useT } from '../lib/i18n'
import { readState } from '../lib/readState'
import type { MarketPrice, Order, WeatherResult } from '../lib/types'

export default function Dashboard() {
  const t = useT()
  const { user, isFarmer } = useAuth()

  const [prices, setPrices] = useState<MarketPrice[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  const [weather, setWeather] = useState<WeatherResult | null>(null)
  const [weatherState, setWeatherState] = useState<'idle' | 'loading' | 'denied' | 'ready'>(
    'idle',
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      // Each panel degrades on its own — one failure must not blank the page.
      const [priceResult, orderResult, notificationResult] = await Promise.allSettled([
        api.marketPrices(),
        api.orders(),
        api.notifications(),
      ])
      if (cancelled) return
      if (priceResult.status === 'fulfilled') setPrices(priceResult.value)
      if (orderResult.status === 'fulfilled') setOrders(orderResult.value)
      if (notificationResult.status === 'fulfilled') {
        setUnread(readState.countUnread(notificationResult.value))
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  function loadWeather() {
    if (!navigator.geolocation) {
      setWeatherState('denied')
      return
    }
    setWeatherState('loading')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await api.weather(
            position.coords.latitude,
            position.coords.longitude,
          )
          setWeather(result)
          setWeatherState('ready')
        } catch {
          setWeatherState('denied')
        }
      },
      () => setWeatherState('denied'),
      { timeout: 8000 },
    )
  }

  const activeOrders = orders.filter(
    (order) => order.status === 'pending' || order.status === 'accepted',
  ).length
  const completedOrders = orders.filter((order) => order.status === 'completed').length

  const actions = [
    isFarmer
      ? {
          to: '/produce',
          Icon: PlusIcon,
          title: t('actionSellProduce'),
          hint: t('actionSellProduceHint'),
        }
      : {
          to: '/produce',
          Icon: MarketIcon,
          title: t('produceTitle'),
          hint: t('produceSubtitle'),
        },
    {
      to: '/market',
      Icon: MarketIcon,
      title: t('actionCheckPrices'),
      hint: t('actionCheckPricesHint'),
    },
    {
      to: '/barter',
      Icon: BarterIcon,
      title: t('actionBarter'),
      hint: t('actionBarterHint'),
    },
    {
      to: '/chat',
      Icon: ChatIcon,
      title: t('actionAskAssistant'),
      hint: t('actionAskAssistantHint'),
    },
    {
      to: '/crop',
      Icon: LeafIcon,
      title: t('actionCropDoctor'),
      hint: t('actionCropDoctorHint'),
    },
  ]

  const stats = [
    { label: t('statActiveOrders'), value: activeOrders, to: '/orders' },
    { label: t('statCompletedOrders'), value: completedOrders, to: '/orders' },
    { label: t('statUnreadAlerts'), value: unread, to: '/notifications' },
  ]

  return (
    <div className="space-y-8">
      {/* --- HERO BANNER --- */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest via-[#0a520c] to-[#126b15] p-6 sm:p-8 text-cream shadow-lift">
        {/* Subtle background ambient circles */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-leaf/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-1/3 h-52 w-52 rounded-full bg-gold/15 blur-xl" />

        <div className="relative z-10 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cream/20 bg-cream/15 px-3.5 py-1 text-xs font-medium text-cream backdrop-blur-md shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf" />
            </span>
            <span>AI Mandi Engine Active • बहुभाषी कृषि साथी</span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl text-cream leading-tight">
            {user?.name ? t('greeting', { name: user.name }) : t('greetingAnonymous')}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-cream/90 font-normal leading-relaxed">
            {t('dashboardSubtitle')} Your smart assistant for mandi rates, crop health, direct trade & government schemes.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <MagicButton
              trigger={(open) => (
                <Button
                  variant="secondary"
                  onClick={open}
                  className="bg-cream text-forest border-0 font-extrabold hover:bg-creamSoft shadow-lift hover:scale-[1.02] active:scale-[0.98] ring-2 ring-gold/40"
                >
                  ✨ {t('magicButtonAsk')} (Magic AI) 🎙️
                </Button>
              )}
            />
            <Link to="/chat">
              <Button
                variant="secondary"
                className="bg-cream/15 text-cream border border-cream/30 font-medium hover:bg-cream/25 shadow-sm"
              >
                🌱 {t('actionAskAssistant')}
              </Button>
            </Link>
            <Link
              to="/market"
              className="inline-flex items-center gap-1.5 rounded-xl border border-cream/30 bg-cream/10 px-4 py-2 text-sm font-medium text-cream backdrop-blur-sm transition-all hover:bg-cream/20"
            >
              📊 {t('actionCheckPrices')} →
            </Link>
          </div>
        </div>
      </div>

      {/* --- MAGIC AI BANNER CARD --- */}
      <MagicButton
        trigger={(open) => (
          <div
            onClick={open}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') open()
            }}
            className="group relative cursor-pointer overflow-hidden rounded-3xl border border-leaf/40 bg-gradient-to-r from-white/95 via-cream to-sageSoft/40 p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-forest hover:shadow-lift"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-forest to-[#0c590e] text-cream text-xl shadow-xs ring-2 ring-leaf/30 transition-transform group-hover:scale-105">
                  ✨
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-extrabold text-forest group-hover:text-forestHover">
                      {t('magicModalTitle')} • Voice & AI Action Router
                    </h3>
                    <span className="rounded-full bg-leafSoft px-2.5 py-0.5 text-[10px] font-bold text-forest border border-leaf/40">
                      🎙️ Speak Naturally
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted leading-relaxed">
                    Say "मुझे 50 क्विंटल गेहूं बेचना है", "What's the weather today?", "Barter tractor", or "Check mandi prices"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <span className="text-xs font-bold text-forest group-hover:underline">
                  {t('magicProceed')}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-cream text-xs transition-transform group-hover:translate-x-1 shadow-xs">
                  →
                </span>
              </div>
            </div>
          </div>
        )}
      />

      {/* --- STATS OVERVIEW --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <Link key={stat.label} to={stat.to} className="group block">
            <Card
              interactive
              className="relative overflow-hidden p-5 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lift"
            >
              {/* Accent top stripe */}
              <div
                className={cx(
                  'absolute inset-x-0 top-0 h-1',
                  i === 0 ? 'bg-forest' : i === 1 ? 'bg-sage' : 'bg-gold',
                )}
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums text-ink">
                    {loading ? <Spinner size={22} className="text-forest" /> : stat.value}
                  </p>
                </div>
                <span
                  className={cx(
                    'flex h-11 w-11 items-center justify-center rounded-2xl shadow-xs transition-transform group-hover:scale-110',
                    i === 0
                      ? 'bg-sageSoft text-forest'
                      : i === 1
                        ? 'bg-leafSoft text-forest'
                        : 'bg-goldSoft text-soil',
                  )}
                >
                  {i === 0 ? (
                    <BarterIcon size={20} />
                  ) : i === 1 ? (
                    <LeafIcon size={20} />
                  ) : (
                    <SunIcon size={20} />
                  )}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-forest group-hover:underline">
                <span>{t('viewAll')}</span>
                <span>→</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* --- QUICK ACTIONS --- */}
      <Section title={t('quickActions')}>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map(({ to, Icon, title, hint }) => (
            <Link key={title} to={to} className="group block">
              <Card
                interactive
                className="flex h-full items-start justify-between gap-3 p-4.5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-leaf/70"
              >
                <div className="flex items-start gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sageSoft to-leafSoft text-forest shadow-xs ring-1 ring-leaf/40 transition-transform group-hover:scale-105">
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink group-hover:text-forest transition-colors">
                      {title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted leading-relaxed">{hint}</p>
                  </div>
                </div>
                <span className="shrink-0 text-muted/60 transition-transform group-hover:translate-x-1 group-hover:text-forest">
                  →
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      {/* --- MANDI PRICES & WEATHER --- */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section
            title={t('todaysPrices')}
            action={
              <Link
                to="/market"
                className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
              >
                <span>{t('viewAll')}</span>
                <span>→</span>
              </Link>
            }
          >
            {loading ? (
              <Card className="p-8">
                <Spinner className="mx-auto text-forest" />
              </Card>
            ) : prices.length === 0 ? (
              <EmptyState title={t('noResults')} />
            ) : (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-line/60">
                  {prices.slice(0, 5).map((price) => (
                    <li
                      key={price.id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-creamSoft/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sageSoft text-forest font-bold text-xs">
                          🌾
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {price.commodity}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {price.mandi_name} · {price.district}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-base font-bold tabular-nums text-forest">
                          {money(price.modal_price)}
                        </p>
                        <p className="text-[11px] font-medium text-muted">{t('perQuintal')}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </Section>
        </div>

        <div>
          <Section title={t('weatherTitle')}>
            <Card className="relative overflow-hidden p-5">
              <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gold/10 blur-xl" />

              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-goldSoft text-gold shadow-2xs">
                    <SunIcon size={20} />
                  </span>
                  <span className="text-sm font-bold text-ink">{t('weatherTitle')}</span>
                </div>
                {weatherState === 'ready' && (
                  <span className="inline-flex items-center rounded-full bg-leafSoft px-2.5 py-0.5 text-[11px] font-semibold text-forest">
                    Live GPS
                  </span>
                )}
              </div>

              {weatherState === 'ready' && weather ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-creamSoft/70 p-3 border border-leaf/20">
                    <p className="text-xs text-muted">{t('locationLabel')}</p>
                    <p className="text-sm font-medium text-forest">
                      {weather.location.lat.toFixed(3)}° N, {weather.location.lon.toFixed(3)}° E
                    </p>
                  </div>
                  <div className="rounded-xl bg-creamSoft/70 p-3 border border-leaf/20">
                    <p className="text-xs text-muted">Alerts Status</p>
                    <p className="text-sm font-medium text-ink">
                      {weather.alerts.length === 0
                        ? t('weatherNoAlerts')
                        : `${weather.alerts.length} active alert(s)`}
                    </p>
                  </div>
                </div>
              ) : weatherState === 'loading' ? (
                <div className="py-6 text-center">
                  <Spinner className="mx-auto text-forest" />
                  <p className="mt-2 text-xs text-muted">Fetching local forecast…</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted leading-relaxed">
                    {t('weatherNeedsLocation')}
                  </p>
                  <Button size="sm" variant="secondary" onClick={loadWeather} className="w-full">
                    <LocationIcon size={14} />
                    {t('enableLocation')}
                  </Button>
                </div>
              )}
            </Card>
          </Section>
        </div>
      </div>
    </div>
  )
}
