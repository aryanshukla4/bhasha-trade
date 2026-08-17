import { useState, type FormEvent } from 'react'
import { LanguageSelect } from '../components/LanguageSelect'
import { WheatIcon } from '../components/icons'
import { Button, ErrorNote, Field, InfoNote, Input, Select, cx } from '../components/ui'
import { ApiError, api } from '../lib/api'
import { ROLES, useAuth } from '../lib/auth'
import { useI18n, useT } from '../lib/i18n'
import type { Role } from '../lib/types'

type Step = 'phone' | 'otp'

export default function Login() {
  const t = useT()
  const { language } = useI18n()
  const { adoptSession } = useAuth()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('farmer')
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [expiresIn, setExpiresIn] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const roleLabels: Record<Role, string> = {
    farmer: t('roleFarmer'),
    buyer: t('roleBuyer'),
    dealer: t('roleDealer'),
  }

  async function handleSendOtp(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await api.sendOtp(phone.trim())
      setExpiresIn(result.expiresInMinutes)
      // In development the backend echoes the code back; prefill it so the
      // demo is one click rather than a trip to the server logs.
      if (result.devOtp) {
        setDevOtp(result.devOtp)
        setOtp(result.devOtp)
      }
      setStep('otp')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      // verify-otp auto-registers unknown numbers, so name/role/language are
      // sent every time — the backend ignores them for existing users.
      const session = await api.verifyOtp({
        phone: phone.trim(),
        otp: otp.trim(),
        name: name.trim() || undefined,
        role,
        preferredLanguage: language,
      })
      adoptSession(session)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setBusy(false)
    }
  }

  function restart() {
    setStep('phone')
    setOtp('')
    setDevOtp(null)
    setError('')
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-page items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft text-brand">
              <WheatIcon size={18} />
            </span>
            <span className="text-sm font-semibold tracking-tight text-ink">{t('appName')}</span>
          </div>
          <LanguageSelect />
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('loginTitle')}</h1>
            <p className="mt-1.5 text-sm text-muted">
              {step === 'phone' ? t('loginSubtitle') : t('otpSentTo', { phone })}
            </p>
          </div>

          <div className="rounded-lg border border-line bg-white p-5 shadow-card">
            {error && <ErrorNote message={error} className="mb-4" />}

            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <Field label={t('phoneLabel')} required htmlFor="phone">
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    autoFocus
                    required
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder={t('phonePlaceholder')}
                  />
                </Field>
                <Button
                  type="submit"
                  variant="primary"
                  block
                  loading={busy}
                  disabled={!phone.trim()}
                >
                  {t('sendOtp')}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                {devOtp && (
                  <InfoNote tone="amber">{t('devOtpHint', { otp: devOtp })}</InfoNote>
                )}

                <Field
                  label={t('otpLabel')}
                  required
                  htmlFor="otp"
                  hint={expiresIn ? t('otpExpiry', { minutes: expiresIn }) : undefined}
                >
                  <Input
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                    className={cx('text-center text-lg tracking-[0.4em]')}
                  />
                </Field>

                <div className="rounded-md border border-line bg-surface/60 p-3">
                  <p className="mb-3 text-xs text-muted">{t('newUserNote')}</p>
                  <div className="space-y-3">
                    <Field label={t('nameLabel')} htmlFor="name">
                      <Input
                        id="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder={t('namePlaceholder')}
                        autoComplete="name"
                      />
                    </Field>
                    <Field label={t('roleLabel')} htmlFor="role">
                      <Select
                        id="role"
                        value={role}
                        onChange={(event) => setRole(event.target.value as Role)}
                      >
                        {ROLES.map((value) => (
                          <option key={value} value={value}>
                            {roleLabels[value]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  block
                  loading={busy}
                  disabled={otp.length < 4}
                >
                  {t('verifyOtp')}
                </Button>
                <Button type="button" variant="ghost" block onClick={restart}>
                  {t('changeNumber')}
                </Button>
              </form>
            )}
          </div>

          <p className="mt-5 text-center text-xs text-muted">{t('appTagline')}</p>
        </div>
      </div>
    </div>
  )
}
