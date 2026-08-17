import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { LocationIcon, SearchIcon } from '../components/icons'
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  LoadingBlock,
  Meter,
  Modal,
  PageHeader,
  Section,
} from '../components/ui'
import { ApiError, api } from '../lib/api'
import { money, shortDate } from '../lib/format'
import { useT } from '../lib/i18n'
import type { MarketPrice } from '../lib/types'

export default function Market() {
  const t = useT()
  const location = useLocation()

  const [prices, setPrices] = useState<MarketPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [commodity, setCommodity] = useState('')
  const [state, setState] = useState('')
  const [district, setDistrict] = useState('')

  const [nearby, setNearby] = useState<MarketPrice[] | null>(null)
  const [nearbyBusy, setNearbyBusy] = useState(false)

  const [trendFor, setTrendFor] = useState<string | null>(null)
  const [trend, setTrend] = useState<MarketPrice[]>([])
  const [trendBusy, setTrendBusy] = useState(false)

  async function load(filters?: { commodity?: string; state?: string; district?: string }) {
    setLoading(true)
    setError('')
    try {
      setPrices(await api.marketPrices(filters))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const s = location.state as {
      fromMagic?: boolean
      prefill?: {
        commodity?: string
        state?: string
        district?: string
      }
    } | null

    if (s?.fromMagic && s.prefill) {
      const comm = s.prefill.commodity || ''
      const st = s.prefill.state || ''
      const dist = s.prefill.district || ''
      if (comm) setCommodity(comm)
      if (st) setState(st)
      if (dist) setDistrict(dist)
      void load({
        commodity: comm.trim() || undefined,
        state: st.trim() || undefined,
        district: dist.trim() || undefined,
      })
    } else {
      void load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    void load({
      commodity: commodity.trim() || undefined,
      state: state.trim() || undefined,
      district: district.trim() || undefined,
    })
  }

  function handleClear() {
    setCommodity('')
    setState('')
    setDistrict('')
    void load()
  }

  function loadNearby() {
    if (!navigator.geolocation) return
    setNearbyBusy(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          setNearby(
            await api.nearbyMandis(position.coords.latitude, position.coords.longitude),
          )
        } catch {
          setNearby([])
        } finally {
          setNearbyBusy(false)
        }
      },
      () => {
        setNearby([])
        setNearbyBusy(false)
      },
      { timeout: 8000 },
    )
  }

  async function openTrend(name: string) {
    setTrendFor(name)
    setTrendBusy(true)
    try {
      setTrend(await api.marketTrends(name))
    } catch {
      setTrend([])
    } finally {
      setTrendBusy(false)
    }
  }

  // Scale the comparison bars against the highest rate on screen.
  const trendMax = trend.reduce((max, row) => Math.max(max, row.modal_price), 0)

  return (
    <div>
      <PageHeader
        title={t('marketTitle')}
        subtitle={t('marketSubtitle')}
        action={
          <Button size="sm" onClick={loadNearby} loading={nearbyBusy}>
            <LocationIcon size={14} />
            {t('nearbyMandis')}
          </Button>
        }
      />

      <Card className="mb-8 p-5 rounded-2xl border border-leaf/30 bg-white/90 shadow-card">
        <form onSubmit={handleSearch} className="grid gap-3.5 sm:grid-cols-4">
          <Field label={t('commodityLabel')} htmlFor="commodity">
            <Input
              id="commodity"
              value={commodity}
              onChange={(event) => setCommodity(event.target.value)}
              placeholder="e.g. Wheat, Rice, Soybean"
              className="rounded-xl"
            />
          </Field>
          <Field label={t('stateLabel')} htmlFor="state">
            <Input
              id="state"
              value={state}
              onChange={(event) => setState(event.target.value)}
              placeholder="Madhya Pradesh"
              className="rounded-xl"
            />
          </Field>
          <Field label={t('districtLabel')} htmlFor="district">
            <Input
              id="district"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder="Indore"
              className="rounded-xl"
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" variant="primary" className="flex-1 rounded-xl py-2 font-semibold">
              <SearchIcon size={15} />
              {t('search')}
            </Button>
            <Button type="button" variant="ghost" onClick={handleClear} className="rounded-xl">
              {t('clear')}
            </Button>
          </div>
        </form>
      </Card>

      {error && <ErrorNote message={error} className="mb-4" />}

      {nearby && (
        <Section title={t('nearbyMandis')}>
          {nearby.length === 0 ? (
            <EmptyState title={t('noResults')} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {nearby.map((price) => (
                <PriceCard
                  key={`nearby-${price.id}`}
                  price={price}
                  onTrend={() => void openTrend(price.commodity)}
                  trendLabel={t('viewTrend')}
                  perQuintal={t('perQuintal')}
                  mandiLabel={t('mandiLabel')}
                />
              ))}
            </div>
          )}
        </Section>
      )}

      {loading ? (
        <LoadingBlock label={t('loading')} />
      ) : prices.length === 0 ? (
        <EmptyState title={t('noResults')} action={<Button onClick={handleClear}>{t('clear')}</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prices.map((price) => (
            <PriceCard
              key={price.id}
              price={price}
              onTrend={() => void openTrend(price.commodity)}
              trendLabel={t('viewTrend')}
              perQuintal={t('perQuintal')}
              mandiLabel={t('mandiLabel')}
            />
          ))}
        </div>
      )}

      <Modal
        open={trendFor !== null}
        onClose={() => setTrendFor(null)}
        title={t('trendFor', { commodity: trendFor ?? '' })}
        wide
      >
        {trendBusy ? (
          <LoadingBlock label={t('loading')} />
        ) : trend.length === 0 ? (
          <EmptyState title={t('noResults')} />
        ) : (
          <div className="space-y-4">
            {trend.map((row) => (
              <div key={row.id} className="rounded-xl bg-creamSoft/60 p-3.5 border border-leaf/20">
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-semibold text-ink">
                    {row.mandi_name}
                    <span className="text-xs font-normal text-muted"> · {row.district}</span>
                  </span>
                  <span className="shrink-0 text-base font-bold text-forest">
                    {money(row.modal_price)}
                  </span>
                </div>
                <Meter value={trendMax ? (row.modal_price / trendMax) * 100 : 0} />
                <p className="mt-1.5 text-[11px] text-muted">
                  {t('recordedOn', { date: shortDate(row.recorded_on) })}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

function PriceCard({
  price,
  onTrend,
  trendLabel,
  perQuintal,
  mandiLabel,
}: {
  price: MarketPrice
  onTrend: () => void
  trendLabel: string
  perQuintal: string
  mandiLabel: string
}) {
  const hasRange = price.min_price !== null && price.max_price !== null
  return (
    <Card interactive className="group flex flex-col p-5 rounded-2xl border border-leaf/30 bg-white/95 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift hover:border-leaf/70">
      <div className="mb-3.5 flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sageSoft to-leafSoft text-forest text-base shadow-2xs ring-1 ring-leaf/30 transition-transform group-hover:scale-105">
            🌾
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-ink group-hover:text-forest transition-colors">
              {price.commodity}
            </h3>
            <p className="truncate text-xs text-muted">
              {mandiLabel}: {price.mandi_name} · {price.district}
            </p>
          </div>
        </div>
      </div>

      <div className="my-2 rounded-xl bg-creamSoft/70 p-3 border border-leaf/15">
        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-extrabold tabular-nums text-forest">
            {money(price.modal_price)}
          </p>
          <span className="text-xs font-semibold text-forest/70">{perQuintal}</span>
        </div>
        {hasRange && (
          <p className="mt-1 text-[11px] font-medium text-muted">
            Range: {money(price.min_price)} – {money(price.max_price)}
          </p>
        )}
      </div>

      <Button
        size="sm"
        variant="secondary"
        className="mt-auto w-full rounded-xl font-semibold border-leaf/40 hover:border-forest"
        onClick={onTrend}
      >
        <span>{trendLabel}</span>
        <span className="ml-1 transition-transform group-hover:translate-x-0.5">→</span>
      </Button>
    </Card>
  )
}
