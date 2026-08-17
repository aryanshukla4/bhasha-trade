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
import { Button, Card, EmptyState, Section, Spinner } from '../components/ui'
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
    <div>
      <div className="mb-7">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {user?.name ? t('greeting', { name: user.name }) : t('greetingAnonymous')}
        </h1>
        <p className="mt-1 text-sm text-muted">{t('dashboardSubtitle')}</p>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="block">
            <Card interactive className="px-4 py-3.5">
              <p className="text-2xl font-semibold tabular-nums text-ink">
                {loading ? <Spinner size={18} className="text-muted" /> : stat.value}
              </p>
              <p className="mt-0.5 text-xs text-muted">{stat.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Section title={t('quickActions')}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map(({ to, Icon, title, hint }) => (
            <Link key={title} to={to}>
              <Card interactive className="flex h-full items-start gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{title}</p>
                  <p className="mt-0.5 text-xs text-muted">{hint}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section
            title={t('todaysPrices')}
            action={
              <Link
                to="/market"
                className="text-xs font-medium text-brand-text hover:underline"
              >
                {t('viewAll')}
              </Link>
            }
          >
            {loading ? (
              <Card className="p-6">
                <Spinner className="mx-auto text-muted" />
              </Card>
            ) : prices.length === 0 ? (
              <EmptyState title={t('noResults')} />
            ) : (
              <Card>
                <ul className="divide-y divide-line">
                  {prices.slice(0, 5).map((price) => (
                    <li
                      key={price.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {price.commodity}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {price.mandi_name} · {price.district}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-brand-text">
                          {money(price.modal_price)}
                        </p>
                        <p className="text-xs text-muted">{t('perQuintal')}</p>
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
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2 text-muted">
                <SunIcon size={18} />
                <span className="text-sm font-medium text-ink">{t('weatherTitle')}</span>
              </div>

              {weatherState === 'ready' && weather ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted">
                    {weather.location.lat.toFixed(3)}, {weather.location.lon.toFixed(3)}
                  </p>
                  <p className="text-sm text-ink">
                    {weather.alerts.length === 0
                      ? t('weatherNoAlerts')
                      : `${weather.alerts.length}`}
                  </p>
                </div>
              ) : weatherState === 'loading' ? (
                <Spinner className="text-muted" />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted">{t('weatherNeedsLocation')}</p>
                  <Button size="sm" onClick={loadWeather}>
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
