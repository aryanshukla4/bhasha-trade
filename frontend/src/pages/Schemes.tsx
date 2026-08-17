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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schemes.map((scheme) => (
            <Card key={scheme.id} interactive className="group flex flex-col p-5 rounded-2xl border border-leaf/30 bg-white/95 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift hover:border-leaf/70">
              <span className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sageSoft to-leafSoft text-forest shadow-xs ring-1 ring-leaf/30 transition-transform group-hover:scale-105">
                <SchemeIcon size={20} />
              </span>
              <h3 className="text-base font-bold text-ink group-hover:text-forest transition-colors">
                {scheme.name ?? scheme.id}
              </h3>
              <p className="mt-1 text-xs text-muted font-mono">{scheme.id}</p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-5 w-full rounded-xl font-semibold border-leaf/40 hover:border-forest"
                onClick={() => void open(scheme)}
              >
                <span>{t('schemeDetails')}</span>
                <span className="ml-1 transition-transform group-hover:translate-x-0.5">→</span>
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
