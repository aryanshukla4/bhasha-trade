import { useEffect, useState, type FormEvent } from 'react'
import { LanguageSelect } from '../components/LanguageSelect'
import { CheckIcon, LocationIcon, LogoutIcon } from '../components/icons'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  LoadingBlock,
  PageHeader,
  Stars,
  useToast,
} from '../components/ui'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { byNewest, shortDate } from '../lib/format'
import { useT } from '../lib/i18n'
import type { Review } from '../lib/types'

export default function Profile() {
  const t = useT()
  const toast = useToast()
  const { user, setUser, signOut } = useAuth()

  const [name, setName] = useState(user?.name ?? '')
  const [location, setLocation] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    api
      .reviewsFor(user.id)
      .then((rows) => {
        if (!cancelled) setReviews([...rows].sort(byNewest))
      })
      .catch(() => {
        if (!cancelled) setReviews([])
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  function useMyLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6))
        setLongitude(position.coords.longitude.toFixed(6))
      },
      () => toast.error(t('somethingWrong')),
      { timeout: 8000 },
    )
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      // Only send what the user filled in — the backend applies non-null
      // fields only, and latitude/longitude/location aren't echoed back.
      const updated = await api.updateProfile({
        name: name.trim() || undefined,
        location: location.trim() || undefined,
        latitude: latitude.trim() ? Number(latitude) : undefined,
        longitude: longitude.trim() ? Number(longitude) : undefined,
      })
      setUser(updated)
      toast.success(t('profileSaved'))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setSaving(false)
    }
  }

  if (!user) return <LoadingBlock label={t('loading')} />

  const roleLabels: Record<string, string> = {
    farmer: t('roleFarmer'),
    buyer: t('roleBuyer'),
    dealer: t('roleDealer'),
  }

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0

  return (
    <div>
      <PageHeader title={t('profileTitle')} subtitle={t('profileSubtitle')} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t('accountSection')} />
            <form onSubmit={handleSave} className="space-y-4 p-4">
              {error && <ErrorNote message={error} />}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('phoneLabel')} htmlFor="profilePhone">
                  <Input id="profilePhone" value={user.phone} disabled readOnly />
                </Field>
                <Field label={t('nameLabel')} htmlFor="profileName">
                  <Input
                    id="profileName"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t('namePlaceholder')}
                  />
                </Field>
              </div>

              <Field label={t('locationLabel')} htmlFor="profileLocation">
                <Input
                  id="profileLocation"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder={t('locationPlaceholder')}
                />
              </Field>

              <Field label={t('coordinatesLabel')}>
                <div className="flex gap-2">
                  <Input
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                    placeholder="21.145800"
                    inputMode="decimal"
                    aria-label="latitude"
                  />
                  <Input
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                    placeholder="79.088200"
                    inputMode="decimal"
                    aria-label="longitude"
                  />
                  <Button type="button" onClick={useMyLocation} title={t('useMyLocation')}>
                    <LocationIcon size={15} />
                  </Button>
                </div>
              </Field>

              <div className="flex justify-end border-t border-line pt-4">
                <Button type="submit" variant="primary" loading={saving}>
                  {t('save')}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader title={t('reviewsAboutYou')} />
            {reviewsLoading ? (
              <LoadingBlock label={t('loading')} />
            ) : reviews.length === 0 ? (
              <div className="p-4">
                <EmptyState title={t('noReviewsYet')} />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <Stars value={Math.round(averageRating)} size={18} />
                  <span className="text-lg font-semibold text-ink">
                    {averageRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted">({reviews.length})</span>
                </div>
                <ul className="divide-y divide-line">
                  {reviews.map((review) => (
                    <li key={review.id} className="p-4">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <Stars value={review.rating} size={13} />
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
              </>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t('preferencesSection')} />
            <div className="space-y-4 p-4">
              <div>
                <p className="mb-1.5 text-sm font-medium text-ink">{t('languageLabel')}</p>
                <LanguageSelect />
                <p className="mt-1.5 text-xs text-muted">{t('languageSaved')}</p>
              </div>

              <div className="border-t border-line pt-4">
                <p className="text-xs text-muted">{t('roleReadonly')}</p>
                <p className="mt-0.5 text-sm text-ink">
                  {roleLabels[user.role] ?? user.role}
                </p>
              </div>

              <div className="border-t border-line pt-4">
                <p className="mb-1 text-xs text-muted">{t('verificationLabel')}</p>
                <Badge tone="green">
                  <CheckIcon size={12} className="mr-1" />
                  {user.verificationStatus === 'phone_verified'
                    ? t('statusPhoneVerified')
                    : user.verificationStatus}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <Button variant="danger" block onClick={() => void signOut()}>
              <LogoutIcon size={15} />
              {t('signOut')}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
