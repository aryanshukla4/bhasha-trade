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
    <div className="flex min-h-screen flex-col bg-transparent text-ink">
      <header className="border-b border-leaf/25 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-page items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-forest to-[#0d5d10] text-cream shadow-xs ring-1 ring-leaf/40">
              <WheatIcon size={20} />
            </span>
            <div>
              <span className="block text-base font-bold tracking-tight text-forest leading-tight">
                {t('appName')}
              </span>
              <span className="block text-[10px] font-medium tracking-wide text-muted -mt-0.5">
                AgriTech AI Platform
              </span>
            </div>
          </div>
          <LanguageSelect />
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sageSoft to-leafSoft text-forest shadow-xs ring-1 ring-leaf/30">
              <WheatIcon size={26} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {t('loginTitle')}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-muted">
              {step === 'phone' ? t('loginSubtitle') : t('otpSentTo', { phone })}
            </p>
          </div>

          <div className="rounded-3xl border border-leaf/30 bg-white/95 p-6 sm:p-7 shadow-lift">
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
                    className="rounded-xl"
                  />
                </Field>
                <Button
                  type="submit"
                  variant="primary"
                  block
                  loading={busy}
                  disabled={!phone.trim()}
                  className="rounded-xl py-2.5 font-semibold shadow-xs"
                >
                  {t('sendOtp')} →
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
