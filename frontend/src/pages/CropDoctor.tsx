import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useLocation } from 'react-router-dom'
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

  const location = useLocation()

  useEffect(() => {
    const s = location.state as {
      fromMagic?: boolean
      prefill?: {
        cropType?: string
      }
    } | null

    if (s?.fromMagic && s.prefill?.cropType) {
      const crop = s.prefill.cropType
      setAdvisoryCrop(crop)
      setAdvisoryBusy(true)
      api
        .cropAdvisory(crop)
        .then((res) => setAdvisory(res))
        .catch(() => setAdvisory(null))
        .finally(() => setAdvisoryBusy(false))
    }
  }, [location.state])

  return (
    <div>
      <PageHeader title={t('cropTitle')} subtitle={t('cropSubtitle')} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="p-6 rounded-2xl border border-leaf/30 bg-white/95 shadow-card">
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
                'group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200',
                dragging
                  ? 'border-forest bg-sageSoft/50 ring-4 ring-leaf/30'
                  : 'border-leaf/50 bg-creamSoft/60 hover:border-forest hover:bg-creamSoft',
              )}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Crop sample"
                  className="max-h-64 w-auto rounded-xl object-contain shadow-xs border border-leaf/30"
                />
              ) : (
                <>
                  <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sageSoft to-leafSoft text-forest shadow-xs ring-1 ring-leaf/30 transition-transform group-hover:scale-110">
                    <LeafIcon size={28} />
                  </span>
                  <p className="text-sm font-semibold text-ink">{t('cropDrop')}</p>
                  <p className="mt-1 text-xs text-muted">Supports JPG, PNG, WEBP from farm camera or gallery</p>
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

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Button onClick={() => fileInputRef.current?.click()} className="rounded-xl font-medium">
                {t('cropChoose')}
              </Button>
              <Button onClick={() => cameraInputRef.current?.click()} className="rounded-xl font-medium">
                <CameraIcon size={15} />
                <span className="ml-1">{t('cropTakePhoto')}</span>
              </Button>
              <Button
                variant="primary"
                className="ml-auto rounded-xl px-5 font-semibold shadow-xs"
                disabled={!file}
                loading={busy}
                onClick={() => void analyse()}
              >
                🔬 {t('cropAnalyse')}
              </Button>
              {file && (
                <Button variant="ghost" onClick={reset} className="rounded-xl">
                  {t('cropAnother')}
                </Button>
              )}
            </div>
          </Card>

          <Card className="rounded-2xl border border-leaf/30 bg-white/95 shadow-card p-5">
            <CardHeader title={t('cropTipsTitle')} />
            <ul className="mt-2 space-y-2.5 text-xs text-muted">
              {[t('cropTip1'), t('cropTip2'), t('cropTip3')].map((tip) => (
                <li key={tip} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sageSoft text-forest">
                    <CheckIcon size={12} />
                  </span>
                  <span className="leading-tight text-ink/80">{tip}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="rounded-2xl border border-leaf/30 bg-white/95 shadow-card p-5">
            <CardHeader title={t('cropAdvisoryTitle')} />
            <div className="mt-3 space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Field label={t('cropTypeLabel')} htmlFor="advisoryCrop">
                    <Input
                      id="advisoryCrop"
                      value={advisoryCrop}
                      onChange={(event) => setAdvisoryCrop(event.target.value)}
                      placeholder="e.g. Tomato, Cotton, Wheat"
                      className="rounded-xl"
                    />
                  </Field>
                </div>
                <Button
                  onClick={() => void loadAdvisory()}
                  loading={advisoryBusy}
                  disabled={!advisoryCrop.trim()}
                  className="rounded-xl"
                >
                  <SearchIcon size={14} />
                </Button>
              </div>

              {advisory && (
                <div className="rounded-xl border border-leaf/30 bg-creamSoft/70 p-3.5">
                  <p className="mb-1 text-sm font-bold text-forest">
                    {t('cropAdvisoryFor', { crop: advisory.cropType })}
                  </p>
                  <p className="text-xs text-ink/90 leading-relaxed">{advisory.advisory}</p>
                  <p className="mt-2 text-[11px] font-medium text-muted">
                    {t('cropSource')}: {advisory.source}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {busy && (
            <Card className="flex flex-col items-center justify-center gap-3 p-12 text-sm text-muted rounded-2xl border border-leaf/30 bg-white/95 shadow-card">
              <Spinner size={24} className="text-forest" />
              <span className="font-semibold text-forest">{t('cropAnalysing')}</span>
            </Card>
          )}

          {unavailable && (
            <Card className="p-6 rounded-2xl border border-gold/40 bg-goldSoft/30 shadow-card">
              <div className="mb-2 flex items-center gap-2 text-soil font-bold">
                <AlertIcon size={18} />
                <h2 className="text-sm font-bold">{t('cropUnavailable')}</h2>
              </div>
              <p className="text-xs text-soil/80 leading-relaxed">{t('cropUnavailableHint')}</p>
            </Card>
          )}

          {error && <ErrorNote message={error} />}

          {result?.status === 'quality_rejected' && (
            <Card className="p-6 rounded-2xl border border-danger/30 bg-white/95 shadow-card">
              <div className="mb-3 flex items-center gap-2 text-danger">
                <AlertIcon size={18} />
                <h2 className="text-sm font-bold">{t('cropQualityRejected')}</h2>
              </div>
              <p className="mb-4 text-xs text-muted leading-relaxed">{result.message}</p>

              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {t('cropQualityIssues')}
              </h3>
              <ul className="mb-4 space-y-1.5">
                {result.issues.map((issue) => (
                  <li key={issue} className="flex items-start gap-2 text-xs text-ink font-medium">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                    {issue}
                  </li>
                ))}
              </ul>

              <QualityMetrics metrics={result.metrics} t={t} />

              <Button className="mt-5 rounded-xl font-semibold" onClick={reset}>
                {t('cropAnother')}
              </Button>
            </Card>
          )}

          {result?.status === 'ok' && (
            <>
              <Card className="p-6 rounded-2xl border border-leaf/30 bg-white/95 shadow-card">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-forest">{t('cropResult')}</h2>
                <RecommendationPanel
                  prediction={result.final_recommendation}
                  t={t}
                  headline
                />
              </Card>

              {result.fallback_triggered && (
                <Card className="p-6 rounded-2xl border border-gold/40 bg-white/95 shadow-card">
                  <div className="mb-3 flex items-center gap-2">
                    <h2 className="text-sm font-bold text-ink">
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

              <Card className="p-6 rounded-2xl border border-leaf/30 bg-white/95 shadow-card">
                <h2 className="mb-3 text-sm font-bold text-ink">
                  {t('cropOtherPossibilities')}
                </h2>
                <div className="space-y-3.5">
                  {result.top3.map((prediction, index) => (
                    <div key={`${prediction.plant}-${prediction.disease}-${index}`} className="rounded-xl bg-creamSoft/60 p-3 border border-leaf/15">
                      <Meter
                        value={prediction.confidence}
                        tone={prediction.is_healthy ? 'green' : index === 0 ? 'amber' : 'blue'}
                        label={`${prediction.plant} — ${prediction.disease}`}
                        valueLabel={percent(prediction.confidence)}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-line/60 pt-4">
                  <QualityMetrics metrics={result.metrics} t={t} />
                </div>
              </Card>
            </>
          )}

          {!busy && !result && !unavailable && !error && (
            <Card className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-leaf/30 bg-white/95 shadow-card">
              <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sageSoft/60 text-forest shadow-xs">
                <LeafIcon size={26} />
              </span>
              <p className="text-sm font-semibold text-forest">Ready to inspect your crops</p>
              <p className="mt-1 text-xs text-muted max-w-xs">{t('cropSubtitle')}</p>
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
    <div className="rounded-2xl bg-creamSoft/70 p-4 border border-leaf/20">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={healthy ? 'green' : 'amber'}>
          {healthy ? t('cropHealthy') : t('cropDiseased')}
        </Badge>
        <Badge>{fromKindwise ? 'Cloud AI' : 'Edge Model'}</Badge>
      </div>

      <p className={headline ? 'text-xl font-extrabold text-ink' : 'text-base font-bold text-ink'}>
        {prediction.plant}
      </p>
      <p className={cx('mb-3 font-medium', headline ? 'text-sm text-forest' : 'text-xs text-forest')}>
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
      <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
        {t('cropMetrics')}
      </h3>
      <dl className="grid grid-cols-3 gap-2.5 text-center">
        <div className="rounded-xl border border-leaf/20 bg-creamSoft/70 px-3 py-2.5 shadow-2xs">
          <dt className="text-[11px] font-medium text-muted">{t('cropMetricBlur')}</dt>
          <dd className="mt-0.5 text-sm font-bold tabular-nums text-forest">
            {metrics.blur_score.toFixed(1)}
          </dd>
        </div>
        <div className="rounded-xl border border-leaf/20 bg-creamSoft/70 px-3 py-2.5 shadow-2xs">
          <dt className="text-[11px] font-medium text-muted">{t('cropMetricBrightness')}</dt>
          <dd className="mt-0.5 text-sm font-bold tabular-nums text-forest">
            {metrics.brightness.toFixed(0)}
          </dd>
        </div>
        <div className="rounded-xl border border-leaf/20 bg-creamSoft/70 px-3 py-2.5 shadow-2xs">
          <dt className="text-[11px] font-medium text-muted">{t('cropMetricGreen')}</dt>
          <dd className="mt-0.5 text-sm font-bold tabular-nums text-forest">
            {percent(metrics.green_ratio * 100)}
          </dd>
        </div>
      </dl>
    </div>
  )
}
