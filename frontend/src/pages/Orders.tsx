import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  LoadingBlock,
  Modal,
  PageHeader,
  StatusBadge,
  Stars,
  Tabs,
  Textarea,
  useToast,
} from '../components/ui'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { byNewest, money, shortDate, shortId } from '../lib/format'
import { useT } from '../lib/i18n'
import type { Order, OrderAction, ProduceListing } from '../lib/types'
import { statusLabel } from './Produce'

type Tab = 'buyer' | 'seller'

export default function Orders() {
  const t = useT()
  const toast = useToast()
  const { user } = useAuth()

  const [tab, setTab] = useState<Tab>('buyer')
  const [orders, setOrders] = useState<Order[]>([])
  /** listing_id -> listing, so rows can show crop names instead of raw ids. */
  const [listings, setListings] = useState<Record<string, ProduceListing>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const [reviewFor, setReviewFor] = useState<Order | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewError, setReviewError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const rows = await api.orders()
      setOrders([...rows].sort(byNewest))

      // Orders embed only listing_id, so hydrate the crop names separately.
      // GET /api/produce/{id} is public and works for non-active listings too.
      const ids = Array.from(new Set(rows.map((order) => order.listing_id)))
      const results = await Promise.allSettled(ids.map((listingId) => api.listing(listingId)))
      const map: Record<string, ProduceListing> = {}
      results.forEach((result) => {
        if (result.status === 'fulfilled') map[result.value.id] = result.value
      })
      setListings(map)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function act(order: Order, action: OrderAction) {
    setBusyId(order.id)
    try {
      const updated = await api.orderAction(order.id, action)
      setOrders((current) =>
        current.map((row) => (row.id === updated.id ? updated : row)),
      )
      toast.success(statusLabel(updated.status, t))
      // A completed or cancelled order changes the listing's status too.
      try {
        const listing = await api.listing(order.listing_id)
        setListings((current) => ({ ...current, [listing.id]: listing }))
      } catch {
        // Non-critical: the row just keeps the crop name it already had.
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setBusyId(null)
    }
  }

  async function submitReview(event: FormEvent) {
    event.preventDefault()
    if (!reviewFor || !user) return
    setReviewError('')
    setReviewBusy(true)
    try {
      const counterparty =
        reviewFor.buyer_id === user.id ? reviewFor.farmer_id : reviewFor.buyer_id
      await api.createReview({
        toUserId: counterparty,
        orderId: reviewFor.id,
        rating,
        comment: comment.trim() || undefined,
      })
      setReviewFor(null)
      setComment('')
      setRating(5)
      toast.success(t('reviewSubmitted'))
    } catch (err) {
      setReviewError(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setReviewBusy(false)
    }
  }

  const asBuyer = orders.filter((order) => order.buyer_id === user?.id)
  const asSeller = orders.filter((order) => order.farmer_id === user?.id)
  const visible = tab === 'buyer' ? asBuyer : asSeller

  return (
    <div>
      <PageHeader
        title={t('ordersTitle')}
        subtitle={t('ordersSubtitle')}
        action={
          <Button size="sm" onClick={() => void load()}>
            {t('refresh')}
          </Button>
        }
      />

      <Tabs<Tab>
        tabs={[
          { id: 'buyer', label: t('tabAsBuyer'), count: asBuyer.length },
          { id: 'seller', label: t('tabAsSeller'), count: asSeller.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {error && <ErrorNote message={error} className="mb-4" />}

      {loading ? (
        <LoadingBlock label={t('loading')} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={tab === 'buyer' ? t('noOrdersBuyer') : t('noOrdersSeller')}
          action={
            tab === 'buyer' ? (
              <Link to="/produce">
                <Button variant="primary">{t('produceTitle')}</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {visible.map((order) => {
            const listing = listings[order.listing_id]
            const isFarmerSide = order.farmer_id === user?.id
            const busy = busyId === order.id

            // Mirrors order_action() in the backend, so no button can 409:
            //   accept   -> farmer only, status must be pending
            //   complete -> either party, status must be accepted
            //   reject / cancel -> either party, any non-terminal status
            const canAccept = isFarmerSide && order.status === 'pending'
            const canComplete = order.status === 'accepted'
            const canDrop = order.status === 'pending' || order.status === 'accepted'
            const canReview = order.status === 'completed'

            return (
              <Card key={order.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-ink">
                        {listing?.crop_type ?? t('loading')}
                      </h3>
                      <StatusBadge
                        status={order.status}
                        label={statusLabel(order.status, t)}
                      />
                    </div>
                    <p className="text-xs text-muted">
                      {t('orderRef', { id: shortId(order.id) })} ·{' '}
                      {t('orderPlaced', { date: shortDate(order.created_at) })}
                    </p>
                    {listing && (
                      <Link
                        to={`/produce/${listing.id}`}
                        className="mt-1 inline-block text-xs text-brand-text hover:underline"
                      >
                        {t('schemeDetails')}
                      </Link>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted">{t('agreedPrice')}</p>
                    <p className="text-lg font-semibold tabular-nums text-brand-text">
                      {money(order.agreed_price)}
                      {listing && (
                        <span className="ml-1 text-xs font-normal text-muted">
                          / {listing.unit}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {(canAccept || canComplete || canDrop || canReview) && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                    {canAccept && (
                      <Button
                        size="sm"
                        variant="primary"
                        loading={busy}
                        onClick={() => void act(order, 'accept')}
                      >
                        {t('actionAccept')}
                      </Button>
                    )}
                    {canComplete && (
                      <Button
                        size="sm"
                        variant="primary"
                        loading={busy}
                        onClick={() => void act(order, 'complete')}
                      >
                        {t('actionComplete')}
                      </Button>
                    )}
                    {canDrop && (
                      <Button
                        size="sm"
                        variant="danger"
                        loading={busy}
                        onClick={() =>
                          void act(order, isFarmerSide ? 'reject' : 'cancel')
                        }
                      >
                        {isFarmerSide ? t('actionReject') : t('actionCancel')}
                      </Button>
                    )}
                    {canReview && (
                      <Button size="sm" onClick={() => setReviewFor(order)}>
                        {t('leaveReview')}
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={reviewFor !== null}
        onClose={() => setReviewFor(null)}
        title={t('reviewFor')}
        footer={
          <>
            <Button onClick={() => setReviewFor(null)}>{t('cancel')}</Button>
            <Button type="submit" form="review-form" variant="primary" loading={reviewBusy}>
              {t('submitReview')}
            </Button>
          </>
        }
      >
        <form id="review-form" onSubmit={submitReview} className="space-y-4">
          {reviewError && <ErrorNote message={reviewError} />}
          <Field label={t('ratingLabel')} required>
            <div className="flex items-center gap-2">
              <Stars value={rating} size={24} onChange={setRating} />
              <span className="text-sm font-medium text-ink">{rating}/5</span>
            </div>
          </Field>
          <Field label={t('commentLabel')} htmlFor="comment">
            <Textarea
              id="comment"
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={t('commentPlaceholder')}
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
