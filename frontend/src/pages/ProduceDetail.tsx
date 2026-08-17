import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckIcon } from '../components/icons'
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorNote,
  Field,
  InfoNote,
  Input,
  LoadingBlock,
  Modal,
  StatusBadge,
  Stars,
  useToast,
} from '../components/ui'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { byNewest, money, number, shortDate } from '../lib/format'
import { useT } from '../lib/i18n'
import type { ProduceListing, Review, VerificationStatus } from '../lib/types'
import { statusLabel } from './Produce'

export default function ProduceDetail() {
  const t = useT()
  const toast = useToast()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { user } = useAuth()

  const [listing, setListing] = useState<ProduceListing | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [verification, setVerification] = useState<VerificationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [offerOpen, setOfferOpen] = useState(false)
  const [orderQuantity, setOrderQuantity] = useState('')
  const [offeredPrice, setOfferedPrice] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [notes, setNotes] = useState('')
  const [offerBusy, setOfferBusy] = useState(false)
  const [offerError, setOfferError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const item = await api.listing(id)
        if (cancelled) return
        setListing(item)
        setOrderQuantity(String(item.quantity))
        setOfferedPrice(String(item.price_per_unit))

        // Seller trust signals — both public, both optional to the page.
        const [reviewResult, verificationResult] = await Promise.allSettled([
          api.reviewsFor(item.farmer_id),
          api.verificationStatus(item.farmer_id),
        ])
        if (cancelled) return
        if (reviewResult.status === 'fulfilled') {
          setReviews([...reviewResult.value].sort(byNewest))
        }
        if (verificationResult.status === 'fulfilled') {
          setVerification(verificationResult.value)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('somethingWrong'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function openOrderModal() {
    if (!listing) return
    setOrderQuantity(String(listing.quantity))
    setOfferedPrice(String(listing.price_per_unit))
    setOfferError('')
    setOfferOpen(true)
  }

  async function handleOffer(event: FormEvent) {
    event.preventDefault()
    if (!listing) return
    setOfferError('')
    const qty = Number(orderQuantity)
    const price = Number(offeredPrice)

    if (!(qty > 0)) {
      setOfferError(t('requiredField'))
      return
    }
    if (qty > listing.quantity) {
      setOfferError(`Quantity cannot exceed available stock (${listing.quantity} ${listing.unit})`)
      return
    }
    if (!(price > 0)) {
      setOfferError(t('requiredField'))
      return
    }

    setOfferBusy(true)
    try {
      await api.expressInterest(id, {
        quantity: qty,
        offeredPrice: price,
        deliveryAddress: deliveryAddress.trim() || undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
      })
      setOfferOpen(false)
      toast.success(t('interestSent'))
      navigate('/orders', { state: { prefill: { tab: 'buyer' } } })
    } catch (err) {
      setOfferError(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setOfferBusy(false)
    }
  }

  if (loading) return <LoadingBlock label={t('loading')} />

  if (error || !listing) {
    return (
      <div>
        <ErrorNote message={error || t('somethingWrong')} className="mb-4" />
        <Link to="/produce">
          <Button>{t('back')}</Button>
        </Link>
      </div>
    )
  }

  const isOwn = listing.farmer_id === user?.id
  const canBuy = !isOwn && listing.status === 'active'
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0

  return (
    <div>
      <Link
        to="/produce"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        ← {t('back')}
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden rounded-2xl border border-leaf/30 bg-white/95 shadow-card">
            {listing.photo_url ? (
              <img
                src={listing.photo_url}
                alt={listing.crop_type}
                className="h-64 w-full border-b border-leaf/20 object-cover sm:h-80"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-sageSoft/70 to-leafSoft/50 text-forest border-b border-leaf/20">
                <span className="text-5xl">🌾</span>
              </div>
            )}
            <div className="p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                    {listing.crop_type}
                  </h1>
                  {(listing.district || listing.state) && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <span>📍</span>
                      <span>{[listing.district, listing.state].filter(Boolean).join(', ')}</span>
                    </p>
                  )}
                </div>
                <StatusBadge status={listing.status} label={statusLabel(listing.status, t)} />
              </div>

              <div className="my-4 rounded-2xl bg-creamSoft/70 p-4 border border-leaf/20">
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-extrabold tabular-nums text-forest">
                    {money(listing.price_per_unit)}
                    <span className="ml-1.5 text-sm font-semibold text-forest/70">/ {listing.unit}</span>
                  </p>
                  <span className="text-sm font-medium text-muted">
                    {t('availableQty', {
                      qty: number(listing.quantity),
                      unit: listing.unit,
                    })}
                  </span>
                </div>
              </div>

              {listing.description && (
                <div className="mt-6 border-t border-line/60 pt-4">
                  <h2 className="mb-1.5 text-sm font-bold text-ink">
                    {t('descriptionLabel')}
                  </h2>
                  <p className="whitespace-pre-wrap text-sm text-ink/80 leading-relaxed">
                    {listing.description}
                  </p>
                </div>
              )}

              <dl className="mt-6 grid gap-3 border-t border-line/60 pt-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted">{t('listedOn', { date: '' }).trim()}</dt>
                  <dd className="mt-0.5 font-medium text-ink">{shortDate(listing.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Listing ID</dt>
                  <dd className="mt-0.5 font-mono text-xs text-muted">{listing.id.slice(0, 8)}</dd>
                </div>
              </dl>

              <div className="mt-6 border-t border-line/60 pt-5">
                {isOwn ? (
                  <InfoNote tone="blue">{t('ownListingNote')}</InfoNote>
                ) : canBuy ? (
                  <Button variant="primary" size="md" className="rounded-xl px-6 py-2.5 font-semibold shadow-xs" onClick={openOrderModal}>
                    🤝 {t('expressInterest')} / Buy Now
                  </Button>
                ) : (
                  <InfoNote tone="amber">{t('noResults')}</InfoNote>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t('listedBy')} />
            <div className="space-y-3 p-4">
              {verification && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckIcon size={15} className="text-forest" />
                  <span className="text-ink">
                    {verification.verificationStatus === 'phone_verified'
                      ? t('statusPhoneVerified')
                      : verification.verificationStatus}
                  </span>
                </div>
              )}
              <div>
                <p className="mb-1 text-xs text-muted">{t('sellerRating')}</p>
                {reviews.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <Stars value={Math.round(averageRating)} />
                    <span className="text-sm font-medium text-ink">
                      {averageRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted">({reviews.length})</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted">{t('noReviewsYet')}</p>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={t('reviewsAboutYou')} />
            {reviews.length === 0 ? (
              <div className="p-4">
                <EmptyState title={t('noReviewsYet')} />
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {reviews.slice(0, 5).map((review) => (
                  <li key={review.id} className="p-4">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <Stars value={review.rating} size={12} />
                      <span className="text-xs text-muted">
                        {shortDate(review.created_at)}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted">{review.comment}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        title="🛒 Place Produce Order"
        footer={
          <>
            <Button onClick={() => setOfferOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" form="offer-form" variant="primary" loading={offerBusy}>
              Confirm & Place Order
            </Button>
          </>
        }
      >
        <form id="offer-form" onSubmit={handleOffer} className="space-y-4">
          {offerError && <ErrorNote message={offerError} />}
          
          <div className="rounded-xl bg-creamSoft/80 p-3.5 border border-leaf/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-ink">{listing.crop_type}</p>
                <p className="text-xs text-muted">Listed price: {money(listing.price_per_unit)} / {listing.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-muted uppercase">Total Est.</p>
                <p className="text-lg font-extrabold text-forest tabular-nums">
                  {money((Number(orderQuantity) || 0) * (Number(offeredPrice) || 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t('quantityLabel')}
              hint={`Stock: ${number(listing.quantity)} ${listing.unit}`}
              htmlFor="orderQuantity"
              required
            >
              <Input
                id="orderQuantity"
                type="number"
                min="0.01"
                max={listing.quantity}
                step="0.01"
                required
                value={orderQuantity}
                onChange={(event) => setOrderQuantity(event.target.value)}
              />
            </Field>

            <Field
              label={t('offeredPriceLabel')}
              hint={t('offeredPriceHint')}
              htmlFor="offeredPrice"
              required
            >
              <Input
                id="offeredPrice"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={offeredPrice}
                onChange={(event) => setOfferedPrice(event.target.value)}
              />
            </Field>
          </div>

          <Field label="Delivery Address / Drop Location" htmlFor="deliveryAddress">
            <Input
              id="deliveryAddress"
              value={deliveryAddress}
              onChange={(event) => setDeliveryAddress(event.target.value)}
              placeholder="e.g. Shop 12, Krishi Mandi, Nagpur"
            />
          </Field>

          <Field label="Payment Preference" htmlFor="paymentMethod">
            <select
              id="paymentMethod"
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-forest focus:outline-none"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              <option value="cod">Cash on Delivery / Spot Payment</option>
              <option value="upi">UPI / Online Direct Transfer</option>
              <option value="mandi">Mandi Direct Slip / Credit</option>
            </select>
          </Field>

          <Field label="Buyer Notes / Special Requirements" htmlFor="notes">
            <Input
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. Require high grade moisture check / urgent delivery"
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
