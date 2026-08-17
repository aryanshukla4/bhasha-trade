import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import { getVoicePrefill } from '../lib/voiceCommands'

/** Map Hindi crop names to English for the form. */
function normalizeCropName(value: string): string {
  const map: Record<string, string> = {
    'गेहूं': 'Wheat', 'गेहू': 'Wheat', 'gehu': 'Wheat', 'gehun': 'Wheat',
    'चावल': 'Rice', 'chawal': 'Rice', 'धान': 'Rice', 'dhan': 'Rice',
    'प्याज': 'Onion', 'pyaz': 'Onion', 'कांदा': 'Onion',
    'टमाटर': 'Tomato', 'tamatar': 'Tomato', 'टोमॅटो': 'Tomato',
    'आलू': 'Potato', 'aloo': 'Potato', 'बटाटा': 'Potato',
    'कपास': 'Cotton', 'kapaas': 'Cotton',
    'गन्ना': 'Sugarcane', 'ganna': 'Sugarcane', 'ऊस': 'Sugarcane',
    'सोयाबीन': 'Soybean', 'soybean': 'Soybean',
    'मक्का': 'Maize', 'makka': 'Maize', 'corn': 'Maize',
    'मिर्च': 'Chilli', 'mirchi': 'Chilli',
    'लहसुन': 'Garlic', 'lahsun': 'Garlic',
    'अदरक': 'Ginger', 'adrak': 'Ginger',
    'हल्दी': 'Turmeric', 'haldi': 'Turmeric',
    'केला': 'Banana', 'banana': 'Banana',
    'आम': 'Mango', 'mango': 'Mango',
    'अंगूर': 'Grapes', 'grapes': 'Grapes',
    'अनार': 'Pomegranate', 'pomegranate': 'Pomegranate',
    'मूंगफली': 'Groundnut', 'groundnut': 'Groundnut',
    'चना': 'Chana', 'chana': 'Chana',
    'दाल': 'Dal', 'dal': 'Dal',
    'मूंग': 'Moong', 'moong': 'Moong',
    'उड़द': 'Urad', 'urad': 'Urad',
    'अरहर': 'Arhar', 'arhar': 'Arhar',
    'सरसों': 'Mustard', 'mustard': 'Mustard',
    'सूरजमुखी': 'Sunflower', 'sunflower': 'Sunflower',
  }
  const lower = value.toLowerCase().trim()
  return map[lower] || map[value.trim()] || value
}

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
  const [searchParams] = useSearchParams()

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
    // Check for voice command prefill — opens the create form with fields filled
    const prefill = getVoicePrefill()
    if (prefill) {
      setForm((prev) => ({
        ...prev,
        cropType: prefill.cropType ? normalizeCropName(prefill.cropType) : prev.cropType,
        quantity: prefill.quantity ?? prev.quantity,
        unit: prefill.unit ?? prev.unit,
        pricePerUnit: prefill.pricePerUnit ?? prev.pricePerUnit,
        state: prefill.state ?? prev.state,
        district: prefill.district ?? prev.district,
        description: prefill.description ?? prev.description,
      }))
      setFormOpen(true)
    }

    // Check URL params for filtering (e.g. from voice command)
    const urlCrop = searchParams.get('cropType')
    const urlState = searchParams.get('state')
    if (urlCrop || urlState) {
      if (urlCrop) setCropFilter(urlCrop)
      if (urlState) setStateFilter(urlState)
      const filters: { cropType?: string; state?: string } = {}
      if (urlCrop) filters.cropType = urlCrop
      if (urlState) filters.state = urlState
      void load(filters)
    } else {
      setCropFilter('')
      setStateFilter('')
      void load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((listing) => {
            const owned = listing.farmer_id === user?.id
            return (
              <Card key={listing.id} interactive className="flex flex-col overflow-hidden">
                {listing.photo_url && (
                  <img
                    src={listing.photo_url}
                    alt={listing.crop_type}
                    className="h-36 w-full border-b border-line object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none'
                    }}
                  />
                )}
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-ink">
                      {listing.crop_type}
                    </h3>
                    <StatusBadge
                      status={listing.status}
                      label={statusLabel(listing.status, t)}
                    />
                  </div>

                  <p className="text-lg font-semibold tabular-nums text-brand-text">
                    {money(listing.price_per_unit)}
                    <span className="ml-1 text-xs font-normal text-muted">
                      / {listing.unit}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {t('availableQty', {
                      qty: number(listing.quantity),
                      unit: listing.unit,
                    })}
                  </p>

                  {(listing.district || listing.state) && (
                    <p className="mt-1 truncate text-xs text-muted">
                      {[listing.district, listing.state].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {listing.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted">
                      {listing.description}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-muted">
                    {t('listedOn', { date: shortDate(listing.created_at) })}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <Link to={`/produce/${listing.id}`} className="flex-1">
                      <Button size="sm" variant="primary" block>
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
                        >
                          <EditIcon size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleting(listing)}
                          aria-label={t('delete')}
                          title={t('delete')}
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
