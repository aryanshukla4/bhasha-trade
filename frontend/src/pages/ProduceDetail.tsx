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
  const [offeredPrice, setOfferedPrice] = useState('')
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

  async function handleOffer(event: FormEvent) {
    event.preventDefault()
    setOfferError('')
    setOfferBusy(true)
    try {
      const price = offeredPrice.trim() ? Number(offeredPrice) : undefined
      if (price !== undefined && !(price > 0)) {
        setOfferError(t('requiredField'))
        return
      }
      await api.expressInterest(id, price)
      setOfferOpen(false)
      toast.success(t('interestSent'))
      navigate('/orders')
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
          <Card className="overflow-hidden">
            {listing.photo_url && (
              <img
                src={listing.photo_url}
                alt={listing.crop_type}
                className="h-56 w-full border-b border-line object-cover sm:h-72"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            )}
            <div className="p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-xl font-semibold tracking-tight text-ink">
                  {listing.crop_type}
                </h1>
                <StatusBadge status={listing.status} label={statusLabel(listing.status, t)} />
              </div>

              <p className="text-2xl font-semibold tabular-nums text-brand-text">
                {money(listing.price_per_unit)}
                <span className="ml-1.5 text-sm font-normal text-muted">/ {listing.unit}</span>
              </p>
              <p className="mt-1 text-sm text-muted">
                {t('availableQty', {
                  qty: number(listing.quantity),
                  unit: listing.unit,
                })}
              </p>

              {listing.description && (
                <div className="mt-5 border-t border-line pt-4">
                  <h2 className="mb-1.5 text-sm font-medium text-ink">
                    {t('descriptionLabel')}
                  </h2>
                  <p className="whitespace-pre-wrap text-sm text-muted">
                    {listing.description}
                  </p>
                </div>
              )}

              <dl className="mt-5 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
                {(listing.district || listing.state) && (
                  <div>
                    <dt className="text-xs text-muted">{t('locationLabel')}</dt>
                    <dd className="mt-0.5 text-ink">
                      {[listing.district, listing.state].filter(Boolean).join(', ')}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted">{t('listedOn', { date: '' }).trim()}</dt>
                  <dd className="mt-0.5 text-ink">{shortDate(listing.created_at)}</dd>
                </div>
              </dl>

              <div className="mt-6 border-t border-line pt-4">
                {isOwn ? (
                  <InfoNote>{t('ownListingNote')}</InfoNote>
                ) : canBuy ? (
                  <Button variant="primary" onClick={() => setOfferOpen(true)}>
                    {t('expressInterest')}
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
                  <CheckIcon size={15} className="text-brand" />
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
        title={t('expressInterest')}
        footer={
          <>
            <Button onClick={() => setOfferOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" form="offer-form" variant="primary" loading={offerBusy}>
              {t('sendOffer')}
            </Button>
          </>
        }
      >
        <form id="offer-form" onSubmit={handleOffer} className="space-y-4">
          {offerError && <ErrorNote message={offerError} />}
          <p className="text-sm text-muted">
            {listing.crop_type} · {money(listing.price_per_unit)} / {listing.unit}
          </p>
          <Field
            label={t('offeredPriceLabel')}
            hint={t('offeredPriceHint')}
            htmlFor="offeredPrice"
          >
            <Input
              id="offeredPrice"
              type="number"
              min="0.01"
              step="0.01"
              value={offeredPrice}
              onChange={(event) => setOfferedPrice(event.target.value)}
              placeholder={String(listing.price_per_unit)}
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
