import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { EditIcon, PlusIcon, SearchIcon, TrashIcon } from '../components/icons'
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  InfoNote,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
  useToast,
} from '../components/ui'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { byNewest, money, number, shortDate } from '../lib/format'
import { useT } from '../lib/i18n'
import type { ProduceListing } from '../lib/types'

const UNITS = ['kg', 'quintal', 'tonne', 'bag', 'crate', 'dozen']

type Tab = 'browse' | 'mine'

interface FormState {
  cropType: string
  quantity: string
  unit: string
  pricePerUnit: string
  description: string
  photoUrl: string
  state: string
  district: string
}

const EMPTY_FORM: FormState = {
  cropType: '',
  quantity: '',
  unit: 'kg',
  pricePerUnit: '',
  description: '',
  photoUrl: '',
  state: '',
  district: '',
}

export default function Produce() {
  const t = useT()
  const toast = useToast()
  const { user, isFarmer } = useAuth()

  const [tab, setTab] = useState<Tab>('browse')
  const [listings, setListings] = useState<ProduceListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [cropFilter, setCropFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProduceListing | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleting, setDeleting] = useState<ProduceListing | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const location = useLocation()

  async function load(filters?: { cropType?: string; state?: string }) {
    setLoading(true)
    setError('')
    try {
      const rows = await api.listings(filters)
      setListings([...rows].sort(byNewest))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const state = location.state as {
      fromMagic?: boolean
      action?: string
      intent?: string
      prefill?: {
        cropType?: string
        cropFilter?: string
        quantity?: number
        unit?: string
        pricePerUnit?: number
        description?: string
        district?: string
        state?: string
        stateFilter?: string
      }
    } | null

    if (state?.fromMagic && state.prefill) {
      const { prefill, action, intent } = state
      if ((action === 'create' || intent === 'sell_produce') && isFarmer) {
        setEditing(null)
        setForm({
          cropType: prefill.cropType || '',
          quantity: prefill.quantity ? String(prefill.quantity) : '',
          unit: prefill.unit || 'kg',
          pricePerUnit: prefill.pricePerUnit ? String(prefill.pricePerUnit) : '',
          description: prefill.description || '',
          photoUrl: '',
          state: prefill.state || '',
          district: prefill.district || '',
        })
        setFormError('')
        setFormOpen(true)
        void load()
      } else if (action === 'browse' || intent === 'buy_produce') {
        const crop = prefill.cropFilter || prefill.cropType || ''
        const loc = prefill.stateFilter || prefill.state || prefill.district || ''
        setTab('browse')
        if (crop) setCropFilter(crop)
        if (loc) setStateFilter(loc)
        void load({
          cropType: crop.trim() || undefined,
          state: loc.trim() || undefined,
        })
      } else {
        void load()
      }
    } else {
      void load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    void load({
      cropType: cropFilter.trim() || undefined,
      state: stateFilter.trim() || undefined,
    })
  }

  // GET /api/produce only ever returns active rows, so "mine" is the active
  // subset owned by this user. Sold and reserved crops surface under Orders.
  const mine = listings.filter((item) => item.farmer_id === user?.id)
  const visible = tab === 'mine' ? mine : listings

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setFormOpen(true)
  }

  function openEdit(listing: ProduceListing) {
    setEditing(listing)
    setForm({
      cropType: listing.crop_type,
      quantity: String(listing.quantity),
      unit: listing.unit,
      pricePerUnit: String(listing.price_per_unit),
      description: listing.description ?? '',
      photoUrl: listing.photo_url ?? '',
      state: listing.state ?? '',
      district: listing.district ?? '',
    })
    setFormError('')
    setFormOpen(true)
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setFormError('')

    const quantity = Number(form.quantity)
    const pricePerUnit = Number(form.pricePerUnit)
    // The backend enforces gt=0 on both; catch it here for a better message.
    if (!form.cropType.trim() || !(quantity > 0) || !(pricePerUnit > 0) || !form.unit) {
      setFormError(t('requiredField'))
      return
    }

    setSaving(true)
    try {
      const payload = {
        cropType: form.cropType.trim(),
        quantity,
        unit: form.unit,
        pricePerUnit,
        description: form.description.trim() || undefined,
        photoUrl: form.photoUrl.trim() || undefined,
        state: form.state.trim() || undefined,
        district: form.district.trim() || undefined,
      }
      if (editing) {
        await api.updateListing(editing.id, payload)
      } else {
        await api.createListing(payload)
      }
      setFormOpen(false)
      toast.success(editing ? t('profileSaved') : t('createListing'))
      await load()
      setTab('mine')
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await api.deleteListing(deleting.id)
      setDeleting(null)
      toast.success(t('delete'))
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('produceTitle')}
        subtitle={t('produceSubtitle')}
        action={
          <Button
            variant="primary"
            onClick={openCreate}
            disabled={!isFarmer}
            title={isFarmer ? undefined : t('farmersOnly')}
          >
            <PlusIcon size={15} />
            {t('newListing')}
          </Button>
        }
      />

      {!isFarmer && <InfoNote className="mb-5">{t('farmersOnly')}</InfoNote>}

      <Tabs<Tab>
        tabs={[
          { id: 'browse', label: t('tabBrowse'), count: listings.length },
          { id: 'mine', label: t('tabMyListings'), count: mine.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'browse' && (
        <Card className="mb-6 p-4">
          <form onSubmit={handleSearch} className="grid gap-3 sm:grid-cols-3">
            <Field label={t('cropTypeLabel')} htmlFor="cropFilter">
              <Input
                id="cropFilter"
                value={cropFilter}
                onChange={(event) => setCropFilter(event.target.value)}
                placeholder={t('cropTypePlaceholder')}
              />
            </Field>
            <Field label={t('stateLabel')} htmlFor="stateFilter">
              <Input
                id="stateFilter"
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value)}
                placeholder="Madhya Pradesh"
              />
            </Field>
            <div className="flex items-end gap-2">
              <Button type="submit" variant="primary" className="flex-1">
                <SearchIcon size={14} />
                {t('search')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCropFilter('')
                  setStateFilter('')
                  void load()
                }}
              >
                {t('clear')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tab === 'mine' && <InfoNote className="mb-5">{t('myListingsNote')}</InfoNote>}

      {error && <ErrorNote message={error} className="mb-4" />}

      {loading ? (
        <LoadingBlock label={t('loading')} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={tab === 'mine' ? t('noMyListings') : t('noListings')}
          action={
            tab === 'mine' && isFarmer ? (
              <Button variant="primary" onClick={openCreate}>
                <PlusIcon size={15} />
                {t('newListing')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((listing) => {
            const owned = listing.farmer_id === user?.id
            return (
              <Card key={listing.id} interactive className="group flex flex-col overflow-hidden rounded-2xl border border-leaf/30 bg-white/95 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift hover:border-leaf/70">
                {listing.photo_url ? (
                  <img
                    src={listing.photo_url}
                    alt={listing.crop_type}
                    className="h-40 w-full border-b border-leaf/20 object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-sageSoft/70 to-leafSoft/50 text-forest border-b border-leaf/20">
                    <span className="text-3xl">🌾</span>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2.5 flex items-start justify-between gap-2">
                    <h3 className="truncate text-base font-bold text-ink group-hover:text-forest transition-colors">
                      {listing.crop_type}
                    </h3>
                    <StatusBadge
                      status={listing.status}
                      label={statusLabel(listing.status, t)}
                    />
                  </div>

                  <div className="my-1.5 flex items-baseline justify-between rounded-xl bg-creamSoft/70 px-3.5 py-2 border border-leaf/15">
                    <p className="text-xl font-extrabold tabular-nums text-forest">
                      {money(listing.price_per_unit)}
                      <span className="ml-1 text-xs font-semibold text-forest/70">
                        / {listing.unit}
                      </span>
                    </p>
                    <span className="text-xs font-medium text-muted">
                      {number(listing.quantity)} {listing.unit}
                    </span>
                  </div>

                  {(listing.district || listing.state) && (
                    <p className="mt-2 flex items-center gap-1 truncate text-xs text-muted">
                      <span>📍</span>
                      <span>{[listing.district, listing.state].filter(Boolean).join(', ')}</span>
                    </p>
                  )}

                  {listing.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted/90 leading-relaxed">
                      {listing.description}
                    </p>
                  )}

                  <p className="mt-2 text-[11px] text-muted">
                    {t('listedOn', { date: shortDate(listing.created_at) })}
                  </p>

                  <div className="mt-4 flex gap-2 pt-2 border-t border-line/60">
                    <Link to={`/produce/${listing.id}`} className="flex-1">
                      <Button size="sm" variant="primary" block className="rounded-xl font-semibold">
                        {owned ? t('schemeDetails') : t('expressInterest')}
                      </Button>
                    </Link>
                    {owned && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => openEdit(listing)}
                          aria-label={t('edit')}
                          title={t('edit')}
                          className="rounded-xl"
                        >
                          <EditIcon size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleting(listing)}
                          aria-label={t('delete')}
                          title={t('delete')}
                          className="rounded-xl"
                        >
                          <TrashIcon size={14} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('updateListing') : t('newListing')}
        wide
        footer={
          <>
            <Button onClick={() => setFormOpen(false)}>{t('cancel')}</Button>
            <Button
              type="submit"
              form="listing-form"
              variant="primary"
              loading={saving}
            >
              {editing ? t('updateListing') : t('createListing')}
            </Button>
          </>
        }
      >
        <form id="listing-form" onSubmit={handleSave} className="space-y-4">
          {formError && <ErrorNote message={formError} />}

          <Field label={t('cropTypeLabel')} required htmlFor="cropType">
            <Input
              id="cropType"
              required
              value={form.cropType}
              onChange={(event) => setForm((prev) => ({ ...prev, cropType: event.target.value }))}
              placeholder={t('cropTypePlaceholder')}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('quantityLabel')} required htmlFor="quantity">
              <Input
                id="quantity"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.quantity}
                onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
              />
            </Field>
            <Field label={t('unitLabel')} required htmlFor="unit">
              <Select
                id="unit"
                value={form.unit}
                onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('pricePerUnitLabel')} required htmlFor="pricePerUnit">
              <Input
                id="pricePerUnit"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.pricePerUnit}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, pricePerUnit: event.target.value }))
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('stateLabel')} htmlFor="listingState">
              <Input
                id="listingState"
                value={form.state}
                onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
              />
            </Field>
            <Field label={t('districtLabel')} htmlFor="listingDistrict">
              <Input
                id="listingDistrict"
                value={form.district}
                onChange={(event) => setForm((prev) => ({ ...prev, district: event.target.value }))}
              />
            </Field>
          </div>

          <Field label={t('descriptionLabel')} htmlFor="description">
            <Textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder={t('descriptionPlaceholder')}
            />
          </Field>

          <Field label={t('photoUrlLabel')} htmlFor="photoUrl">
            <Input
              id="photoUrl"
              type="url"
              value={form.photoUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, photoUrl: event.target.value }))}
              placeholder="https://…"
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('delete')}
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>{t('cancel')}</Button>
            <Button variant="danger" loading={deleteBusy} onClick={() => void handleDelete()}>
              {t('delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">{t('deleteListingConfirm')}</p>
        {deleting && (
          <p className="mt-2 text-sm font-medium text-muted">{deleting.crop_type}</p>
        )}
      </Modal>
    </div>
  )
}

export function statusLabel(status: string, t: ReturnType<typeof useT>): string {
  switch (status) {
    case 'active':
      return t('statusActive')
    case 'reserved':
      return t('statusReserved')
    case 'sold':
      return t('statusSold')
    case 'cancelled':
      return t('statusCancelled')
    case 'pending':
      return t('statusPending')
    case 'accepted':
      return t('statusAccepted')
    case 'completed':
      return t('statusCompleted')
    case 'open':
      return t('statusOpen')
    case 'suggested':
      return t('statusSuggested')
    case 'connected':
      return t('statusConnected')
    case 'confirmed':
      return t('statusConfirmed')
    default:
      return status
  }
}
