import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  const [searchParams] = useSearchParams()

  const [prices, setPrices] = useState<MarketPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [commodity, setCommodity] = useState(() => searchParams.get('commodity') ?? '')
  const [state, setState] = useState(() => searchParams.get('state') ?? '')
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
    const initialCommodity = searchParams.get('commodity')
    const initialState = searchParams.get('state')
    const filters: { commodity?: string; state?: string } = {}
    if (initialCommodity) filters.commodity = initialCommodity
    if (initialState) filters.state = initialState
    if (Object.keys(filters).length > 0) {
      if (initialCommodity) setCommodity(initialCommodity)
      if (initialState) setState(initialState)
      void load(filters)
    } else {
      setCommodity('')
      setState('')
      void load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

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

      <Card className="mb-6 p-4">
        <form onSubmit={handleSearch} className="grid gap-3 sm:grid-cols-4">
          <Field label={t('commodityLabel')} htmlFor="commodity">
            <Input
              id="commodity"
              value={commodity}
              onChange={(event) => setCommodity(event.target.value)}
              placeholder="Wheat"
            />
          </Field>
          <Field label={t('stateLabel')} htmlFor="state">
            <Input
              id="state"
              value={state}
              onChange={(event) => setState(event.target.value)}
              placeholder="Madhya Pradesh"
            />
          </Field>
          <Field label={t('districtLabel')} htmlFor="district">
            <Input
              id="district"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder="Indore"
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" variant="primary" className="flex-1">
              <SearchIcon size={14} />
              {t('search')}
            </Button>
            <Button type="button" variant="ghost" onClick={handleClear}>
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <div key={row.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-ink">
                    {row.mandi_name}
                    <span className="text-muted"> · {row.district}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-brand-text">
                    {money(row.modal_price)}
                  </span>
                </div>
                <Meter value={trendMax ? (row.modal_price / trendMax) * 100 : 0} />
                <p className="mt-1 text-xs text-muted">
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
    <Card interactive className="flex flex-col p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink">{price.commodity}</h3>
          <p className="mt-0.5 truncate text-xs text-muted">
            {mandiLabel}: {price.mandi_name}
          </p>
          <p className="truncate text-xs text-muted">
            {price.district}, {price.state}
          </p>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-xl font-semibold tabular-nums text-brand-text">
          {money(price.modal_price)}
        </p>
        <p className="text-xs text-muted">{perQuintal}</p>
        {hasRange && (
          <p className="mt-1 text-xs text-muted">
            {money(price.min_price)} – {money(price.max_price)}
          </p>
        )}
      </div>

      <Button size="sm" className="mt-auto w-full" onClick={onTrend}>
        {trendLabel}
      </Button>
    </Card>
  )
}
