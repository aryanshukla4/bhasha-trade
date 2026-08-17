import { useEffect, useState, type FormEvent } from 'react'
import { BarterIcon, CheckIcon, SearchIcon } from '../components/icons'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorNote,
  Field,
  InfoNote,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
  useToast,
} from '../components/ui'
import { ApiError, api } from '../lib/api'
import { byNewest, shortDate } from '../lib/format'
import { useT } from '../lib/i18n'
import type {
  BarterMatchWithDealer,
  BarterParseResult,
  BarterRequest,
  Dealer,
} from '../lib/types'
import { statusLabel } from './Produce'

type Tab = 'new' | 'history' | 'dealers'

/** The backend parser only recognises these; keep the selects aligned to it. */
const WANTED_OPTIONS = ['fertilizer', 'seeds', 'pesticide']
const OFFERED_OPTIONS = ['wheat', 'rice']

export default function Barter() {
  const t = useT()
  const toast = useToast()

  const [tab, setTab] = useState<Tab>('new')

  // --- new swap ---
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<BarterParseResult | null>(null)
  const [itemWanted, setItemWanted] = useState('')
  const [itemOffered, setItemOffered] = useState('')
  const [qtyWanted, setQtyWanted] = useState('')
  const [qtyOffered, setQtyOffered] = useState('')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')

  // --- history + matches ---
  const [history, setHistory] = useState<BarterRequest[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [openRequest, setOpenRequest] = useState<string | null>(null)
  const [matches, setMatches] = useState<BarterMatchWithDealer[]>([])
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [matchBusy, setMatchBusy] = useState<string | null>(null)

  // --- dealers ---
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [dealersLoading, setDealersLoading] = useState(false)
  const [dealerItem, setDealerItem] = useState('')
  const [dealerLocation, setDealerLocation] = useState('')

  const itemLabels: Record<string, string> = {
    fertilizer: t('itemFertilizer'),
    seeds: t('itemSeeds'),
    pesticide: t('itemPesticide'),
    wheat: t('itemWheat'),
    rice: t('itemRice'),
  }
  const label = (value: string) => itemLabels[value] ?? value

  async function loadHistory() {
    setHistoryLoading(true)
    try {
      const rows = await api.barterHistory()
      setHistory([...rows].sort(byNewest))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setHistoryLoading(false)
    }
  }

  async function loadDealers(filters?: { item?: string; location?: string }) {
    setDealersLoading(true)
    try {
      setDealers(await api.dealers(filters))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setDealersLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'history' && history.length === 0) void loadHistory()
    if (tab === 'dealers' && dealers.length === 0) void loadDealers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function handleParse(event: FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    setParsing(true)
    setFormError('')
    try {
      const result = await api.parseBarter(text.trim())
      setParsed(result)
      // Prefill whatever the parser understood; the farmer can still correct it.
      if (result.itemWanted) setItemWanted(result.itemWanted)
      if (result.itemOffered) setItemOffered(result.itemOffered)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setParsing(false)
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setFormError('')
    if (!itemWanted || !itemOffered) {
      setFormError(t('requiredField'))
      return
    }
    setCreating(true)
    try {
      const request = await api.createBarterRequest({
        itemWanted,
        itemOffered,
        qtyWanted: qtyWanted.trim() ? Number(qtyWanted) : undefined,
        qtyOffered: qtyOffered.trim() ? Number(qtyOffered) : undefined,
        rawQueryText: text.trim() || undefined,
      })
      toast.success(t('barterCreated'))
      setText('')
      setParsed(null)
      setItemWanted('')
      setItemOffered('')
      setQtyWanted('')
      setQtyOffered('')
      await loadHistory()
      setTab('history')
      await openMatches(request.id)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setCreating(false)
    }
  }

  async function openMatches(requestId: string) {
    setOpenRequest(requestId)
    setMatchesLoading(true)
    try {
      setMatches(await api.barterMatches(requestId))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('somethingWrong'))
      setMatches([])
    } finally {
      setMatchesLoading(false)
    }
  }

  async function connect(requestId: string, dealerId: string) {
    setMatchBusy(dealerId)
    try {
      await api.barterConnect(requestId, dealerId)
      toast.success(t('connectedNote'))
      await openMatches(requestId)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setMatchBusy(null)
    }
  }

  async function confirm(requestId: string, dealerId: string) {
    setMatchBusy(dealerId)
    try {
      await api.barterConfirm(requestId, dealerId)
      toast.success(t('confirmedNote'))
      await Promise.all([openMatches(requestId), loadHistory()])
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setMatchBusy(null)
    }
  }

  return (
    <div>
      <PageHeader title={t('barterTitle')} subtitle={t('barterSubtitle')} />

      <Tabs<Tab>
        tabs={[
          { id: 'new', label: t('tabNewSwap') },
          { id: 'history', label: t('tabHistory'), count: history.length },
          { id: 'dealers', label: t('tabDealers'), count: dealers.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'new' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title={t('barterDescribe')} />
            <form onSubmit={handleParse} className="space-y-3 p-4">
              <Textarea
                rows={3}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={t('barterPlaceholder')}
              />
              <Button type="submit" variant="primary" loading={parsing} disabled={!text.trim()}>
                <BarterIcon size={15} />
                {t('barterParse')}
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader title={t('createBarterRequest')} />
            <form onSubmit={handleCreate} className="space-y-4 p-4">
              {formError && <ErrorNote message={formError} />}

              {parsed &&
                (parsed.needsClarification ? (
                  <InfoNote tone="amber">{t('barterNeedsClarification')}</InfoNote>
                ) : (
                  <InfoNote tone="green">{t('barterParsed')}</InfoNote>
                ))}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('itemWantedLabel')} required htmlFor="itemWanted">
                  <Select
                    id="itemWanted"
                    value={itemWanted}
                    onChange={(event) => setItemWanted(event.target.value)}
                    required
                  >
                    <option value="">—</option>
                    {WANTED_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {label(value)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('qtyWantedLabel')} htmlFor="qtyWanted">
                  <Input
                    id="qtyWanted"
                    type="number"
                    min="0"
                    step="0.01"
                    value={qtyWanted}
                    onChange={(event) => setQtyWanted(event.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('itemOfferedLabel')} required htmlFor="itemOffered">
                  <Select
                    id="itemOffered"
                    value={itemOffered}
                    onChange={(event) => setItemOffered(event.target.value)}
                    required
                  >
                    <option value="">—</option>
                    {OFFERED_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {label(value)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('qtyOfferedLabel')} htmlFor="qtyOffered">
                  <Input
                    id="qtyOffered"
                    type="number"
                    min="0"
                    step="0.01"
                    value={qtyOffered}
                    onChange={(event) => setQtyOffered(event.target.value)}
                  />
                </Field>
              </div>

              <Button
                type="submit"
                variant="primary"
                block
                loading={creating}
                disabled={!itemWanted || !itemOffered}
              >
                {t('createBarterRequest')}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {tab === 'history' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            {historyLoading ? (
              <LoadingBlock label={t('loading')} />
            ) : history.length === 0 ? (
              <EmptyState
                title={t('noBarterHistory')}
                action={
                  <Button variant="primary" onClick={() => setTab('new')}>
                    {t('tabNewSwap')}
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {history.map((request) => (
                  <Card
                    key={request.id}
                    interactive
                    className={
                      openRequest === request.id
                        ? 'border-forest p-4 ring-1 ring-forest'
                        : 'p-4'
                    }
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ink">
                        {label(request.item_offered)} → {label(request.item_wanted)}
                      </p>
                      <StatusBadge
                        status={request.status}
                        label={statusLabel(request.status, t)}
                      />
                    </div>
                    {request.raw_query_text && (
                      <p className="mb-2 line-clamp-2 text-xs italic text-muted">
                        “{request.raw_query_text}”
                      </p>
                    )}
                    <p className="text-xs text-muted">{shortDate(request.created_at)}</p>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => void openMatches(request.id)}
                    >
                      {t('findMatches')}
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            {openRequest && (
              <Card>
                <CardHeader title={t('matchesFor')} />
                {matchesLoading ? (
                  <LoadingBlock label={t('loading')} />
                ) : matches.length === 0 ? (
                  <div className="p-4">
                    <EmptyState title={t('noDealers')} />
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {matches.map((match) => (
                      <li key={match.id} className="p-4">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">
                              {match.dealer.name}
                            </p>
                            {match.dealer.location && (
                              <p className="truncate text-xs text-muted">
                                {match.dealer.location}
                              </p>
                            )}
                          </div>
                          <StatusBadge
                            status={match.status}
                            label={statusLabel(match.status, t)}
                          />
                        </div>

                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {Object.keys(match.dealer.items_available ?? {}).map((item) => (
                            <Badge key={item}>{label(item)}</Badge>
                          ))}
                          <Badge tone="green">
                            {t('matchScore')} {Math.round(match.match_score * 100)}%
                          </Badge>
                        </div>

                        <div className="flex gap-2">
                          {match.status === 'suggested' && (
                            <Button
                              size="sm"
                              variant="primary"
                              loading={matchBusy === match.dealer_id}
                              onClick={() => void connect(openRequest, match.dealer_id)}
                            >
                              {t('actionConnect')}
                            </Button>
                          )}
                          {match.status === 'connected' && (
                            <Button
                              size="sm"
                              variant="primary"
                              loading={matchBusy === match.dealer_id}
                              onClick={() => void confirm(openRequest, match.dealer_id)}
                            >
                              <CheckIcon size={14} />
                              {t('actionConfirmSwap')}
                            </Button>
                          )}
                          {match.status === 'confirmed' && (
                            <p className="text-sm text-forest">{t('confirmedNote')}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === 'dealers' && (
        <div>
          <Card className="mb-5 p-4">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void loadDealers({
                  item: dealerItem.trim() || undefined,
                  location: dealerLocation.trim() || undefined,
                })
              }}
              className="grid gap-3 sm:grid-cols-3"
            >
              <Field label={t('dealerItems')} htmlFor="dealerItem">
                <Select
                  id="dealerItem"
                  value={dealerItem}
                  onChange={(event) => setDealerItem(event.target.value)}
                >
                  <option value="">{t('all')}</option>
                  {WANTED_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {label(value)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('dealerLocation')} htmlFor="dealerLocation">
                <Input
                  id="dealerLocation"
                  value={dealerLocation}
                  onChange={(event) => setDealerLocation(event.target.value)}
                  placeholder="Indore"
                />
              </Field>
              <div className="flex items-end">
                <Button type="submit" variant="primary" block>
                  <SearchIcon size={14} />
                  {t('search')}
                </Button>
              </div>
            </form>
          </Card>

          {dealersLoading ? (
            <LoadingBlock label={t('loading')} />
          ) : dealers.length === 0 ? (
            <EmptyState title={t('noDealers')} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dealers.map((dealer) => (
                <Card key={dealer.id} interactive className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-ink">{dealer.name}</h3>
                    {dealer.verification_status === 'verified' && (
                      <Badge tone="green">{t('verified')}</Badge>
                    )}
                  </div>
                  {dealer.location && (
                    <p className="mb-2 truncate text-xs text-muted">{dealer.location}</p>
                  )}
                  {dealer.phone && (
                    <p className="mb-2 text-xs text-muted">{dealer.phone}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(dealer.items_available ?? {}).map((item) => (
                      <Badge key={item}>{label(item)}</Badge>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
