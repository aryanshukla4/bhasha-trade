import { useEffect, useState } from 'react'
import { SchemeIcon } from '../components/icons'
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  InfoNote,
  LoadingBlock,
  Modal,
  PageHeader,
} from '../components/ui'
import { ApiError, api } from '../lib/api'
import { useT } from '../lib/i18n'
import type { EligibilityResult, Scheme } from '../lib/types'

export default function Schemes() {
  const t = useT()

  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selected, setSelected] = useState<Scheme | null>(null)
  const [detail, setDetail] = useState<Scheme | null>(null)
  const [detailBusy, setDetailBusy] = useState(false)
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null)
  const [eligibilityBusy, setEligibilityBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .schemes()
      .then((rows) => {
        if (!cancelled) setSchemes(rows)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : t('somethingWrong'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function open(scheme: Scheme) {
    setSelected(scheme)
    setDetail(null)
    setEligibility(null)
    setDetailBusy(true)
    try {
      setDetail(await api.scheme(scheme.id))
    } catch {
      setDetail(null)
    } finally {
      setDetailBusy(false)
    }
  }

  async function check() {
    if (!selected) return
    setEligibilityBusy(true)
    try {
      setEligibility(await api.checkEligibility(selected.id))
    } catch {
      setEligibility(null)
    } finally {
      setEligibilityBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title={t('schemesTitle')} subtitle={t('schemesSubtitle')} />

      {error && <ErrorNote message={error} className="mb-4" />}

      {loading ? (
        <LoadingBlock label={t('loading')} />
      ) : schemes.length === 0 ? (
        <EmptyState title={t('noResults')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {schemes.map((scheme) => (
            <Card key={scheme.id} interactive className="flex flex-col p-4">
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-brand-soft text-brand">
                <SchemeIcon size={18} />
              </span>
              <h3 className="text-sm font-semibold text-ink">{scheme.name ?? scheme.id}</h3>
              <p className="mt-0.5 text-xs text-muted">{scheme.id}</p>
              <Button size="sm" className="mt-4 w-full" onClick={() => void open(scheme)}>
                {t('schemeDetails')}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? selected?.id ?? ''}
        footer={
          <>
            <Button onClick={() => setSelected(null)}>{t('close')}</Button>
            <Button variant="primary" loading={eligibilityBusy} onClick={() => void check()}>
              {t('checkEligibility')}
            </Button>
          </>
        }
      >
        {detailBusy ? (
          <LoadingBlock label={t('loading')} />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">{detail?.description ?? t('noResults')}</p>

            {eligibility && (
              <InfoNote tone={eligibility.requiresReview ? 'amber' : 'green'}>
                {eligibility.requiresReview
                  ? t('eligibilityNeedsReview')
                  : String(eligibility.eligible)}
              </InfoNote>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
