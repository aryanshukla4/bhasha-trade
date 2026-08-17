import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { AlertIcon, CameraIcon, CheckIcon, LeafIcon, SearchIcon } from '../components/icons'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorNote,
  Field,
  InfoNote,
  Input,
  Meter,
  PageHeader,
  Spinner,
  cx,
} from '../components/ui'
import { ApiError, api } from '../lib/api'
import { percent } from '../lib/format'
import { useT } from '../lib/i18n'
import {
  isKindwise,
  isKindwiseError,
  type CropAdvisory,
  type CropDetectionResult,
  type KindwisePrediction,
  type OwnModelPrediction,
} from '../lib/types'

export default function CropDoctor() {
  const t = useT()

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<CropDetectionResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  /** A 503 means the model/deps are missing — a different message entirely. */
  const [unavailable, setUnavailable] = useState(false)
  const [dragging, setDragging] = useState(false)

  const [advisoryCrop, setAdvisoryCrop] = useState('')
  const [advisory, setAdvisory] = useState<CropAdvisory | null>(null)
  const [advisoryBusy, setAdvisoryBusy] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  function acceptFile(next: File | undefined | null) {
    if (!next) return
    setFile(next)
    setResult(null)
    setError('')
    setUnavailable(false)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(next))
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.target.files?.[0])
    // Reset so re-picking the same file still fires a change event.
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    acceptFile(event.dataTransfer.files?.[0])
  }

  async function analyse() {
    if (!file) return
    setBusy(true)
    setError('')
    setUnavailable(false)
    try {
      setResult(await api.detectDisease(file))
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setUnavailable(true)
      } else {
        setError(err instanceof ApiError ? err.message : t('somethingWrong'))
      }
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    setResult(null)
    setError('')
    setUnavailable(false)
  }

  async function loadAdvisory() {
    const crop = advisoryCrop.trim()
    if (!crop) return
    setAdvisoryBusy(true)
    try {
      setAdvisory(await api.cropAdvisory(crop))
    } catch {
      setAdvisory(null)
    } finally {
      setAdvisoryBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title={t('cropTitle')} subtitle={t('cropSubtitle')} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <Card className="p-4">
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click()
              }}
              className={cx(
                'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                dragging ? 'border-brand bg-brand-soft' : 'border-line hover:border-brand',
              )}
            >
              {preview ? (
                <img
                  src={preview}
                  alt=""
                  className="max-h-64 w-auto rounded-md object-contain"
                />
              ) : (
                <>
                  <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <LeafIcon size={22} />
                  </span>
                  <p className="text-sm text-muted">{t('cropDrop')}</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInput}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleInput}
              className="hidden"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => fileInputRef.current?.click()}>
                {t('cropChoose')}
              </Button>
              <Button onClick={() => cameraInputRef.current?.click()}>
                <CameraIcon size={15} />
                {t('cropTakePhoto')}
              </Button>
              <Button
                variant="primary"
                className="ml-auto"
                disabled={!file}
                loading={busy}
                onClick={() => void analyse()}
              >
                {t('cropAnalyse')}
              </Button>
              {file && (
                <Button variant="ghost" onClick={reset}>
                  {t('cropAnother')}
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={t('cropTipsTitle')} />
            <ul className="space-y-2 p-4 text-sm text-muted">
              {[t('cropTip1'), t('cropTip2'), t('cropTip3')].map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <CheckIcon size={15} className="mt-0.5 shrink-0 text-brand" />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title={t('cropAdvisoryTitle')} />
            <div className="space-y-3 p-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Field label={t('cropTypeLabel')} htmlFor="advisoryCrop">
                    <Input
                      id="advisoryCrop"
                      value={advisoryCrop}
                      onChange={(event) => setAdvisoryCrop(event.target.value)}
                      placeholder="Tomato"
                    />
                  </Field>
                </div>
                <Button
                  onClick={() => void loadAdvisory()}
                  loading={advisoryBusy}
                  disabled={!advisoryCrop.trim()}
                >
                  <SearchIcon size={14} />
                </Button>
              </div>

              {advisory && (
                <div className="rounded-md border border-line bg-surface p-3">
                  <p className="mb-1 text-sm font-medium text-ink">
                    {t('cropAdvisoryFor', { crop: advisory.cropType })}
                  </p>
                  <p className="text-sm text-muted">{advisory.advisory}</p>
                  <p className="mt-2 text-xs text-muted">
                    {t('cropSource')}: {advisory.source}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          {busy && (
            <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted">
              <Spinner />
              {t('cropAnalysing')}
            </Card>
          )}

          {unavailable && (
            <Card className="p-5">
              <div className="mb-2 flex items-center gap-2 text-warn">
                <AlertIcon size={18} />
                <h2 className="text-sm font-semibold">{t('cropUnavailable')}</h2>
              </div>
              <p className="text-sm text-muted">{t('cropUnavailableHint')}</p>
            </Card>
          )}

          {error && <ErrorNote message={error} />}

          {result?.status === 'quality_rejected' && (
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2 text-warn">
                <AlertIcon size={18} />
                <h2 className="text-sm font-semibold">{t('cropQualityRejected')}</h2>
              </div>
              <p className="mb-4 text-sm text-muted">{result.message}</p>

              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {t('cropQualityIssues')}
              </h3>
              <ul className="mb-4 space-y-1.5">
                {result.issues.map((issue) => (
                  <li key={issue} className="flex items-start gap-2 text-sm text-ink">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                    {issue}
                  </li>
                ))}
              </ul>

              <QualityMetrics metrics={result.metrics} t={t} />

              <Button className="mt-4" onClick={reset}>
                {t('cropAnother')}
              </Button>
            </Card>
          )}

          {result?.status === 'ok' && (
            <>
              <Card className="p-5">
                <h2 className="mb-3 text-sm font-semibold text-ink">{t('cropResult')}</h2>
                <RecommendationPanel
                  prediction={result.final_recommendation}
                  t={t}
                  headline
                />
              </Card>

              {result.fallback_triggered && (
                <Card className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-ink">
                      {t('cropSecondOpinion')}
                    </h2>
                    <Badge tone="amber">{t('cropConfidence')}</Badge>
                  </div>
                  <InfoNote tone="amber" className="mb-3">
                    {t('cropFallbackNote')}
                  </InfoNote>

                  {isKindwiseError(result.kindwise_result) ? (
                    <ErrorNote message={result.kindwise_result.error} />
                  ) : result.kindwise_result ? (
                    <RecommendationPanel prediction={result.kindwise_result} t={t} />
                  ) : null}
                </Card>
              )}

              <Card className="p-5">
                <h2 className="mb-3 text-sm font-semibold text-ink">
                  {t('cropOtherPossibilities')}
                </h2>
                <div className="space-y-3">
                  {result.top3.map((prediction, index) => (
                    <Meter
                      key={`${prediction.plant}-${prediction.disease}-${index}`}
                      value={prediction.confidence}
                      tone={prediction.is_healthy ? 'green' : index === 0 ? 'amber' : 'blue'}
                      label={`${prediction.plant} — ${prediction.disease}`}
                      valueLabel={percent(prediction.confidence)}
                    />
                  ))}
                </div>

                <div className="mt-5 border-t border-line pt-4">
                  <QualityMetrics metrics={result.metrics} t={t} />
                </div>
              </Card>
            </>
          )}

          {!busy && !result && !unavailable && !error && (
            <Card className="flex flex-col items-center justify-center p-10 text-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted">
                <LeafIcon size={22} />
              </span>
              <p className="text-sm text-muted">{t('cropSubtitle')}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function RecommendationPanel({
  prediction,
  t,
  headline = false,
}: {
  prediction: OwnModelPrediction | KindwisePrediction
  t: ReturnType<typeof useT>
  headline?: boolean
}) {
  // The two prediction shapes differ: only the own-model one carries is_healthy.
  const fromKindwise = isKindwise(prediction)
  const healthy = !fromKindwise && prediction.is_healthy

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={healthy ? 'green' : 'amber'}>
          {healthy ? t('cropHealthy') : t('cropDiseased')}
        </Badge>
        <Badge>{fromKindwise ? 'kindwise_api' : 'own_model'}</Badge>
      </div>

      <p className={headline ? 'text-lg font-semibold text-ink' : 'text-sm font-medium text-ink'}>
        {prediction.plant}
      </p>
      <p className={cx('mb-3', headline ? 'text-sm text-muted' : 'text-xs text-muted')}>
        {prediction.disease}
      </p>

      <Meter
        value={prediction.confidence}
        tone={healthy ? 'green' : 'amber'}
        label={t('cropConfidence')}
        valueLabel={percent(prediction.confidence)}
      />
    </div>
  )
}

function QualityMetrics({
  metrics,
  t,
}: {
  metrics: { blur_score: number; brightness: number; green_ratio: number }
  t: ReturnType<typeof useT>
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {t('cropMetrics')}
      </h3>
      <dl className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md border border-line bg-surface px-2 py-2">
          <dt className="text-xs text-muted">{t('cropMetricBlur')}</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
            {metrics.blur_score.toFixed(1)}
          </dd>
        </div>
        <div className="rounded-md border border-line bg-surface px-2 py-2">
          <dt className="text-xs text-muted">{t('cropMetricBrightness')}</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
            {metrics.brightness.toFixed(0)}
          </dd>
        </div>
        <div className="rounded-md border border-line bg-surface px-2 py-2">
          <dt className="text-xs text-muted">{t('cropMetricGreen')}</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
            {(metrics.green_ratio * 100).toFixed(0)}%
          </dd>
        </div>
      </dl>
    </div>
  )
}
