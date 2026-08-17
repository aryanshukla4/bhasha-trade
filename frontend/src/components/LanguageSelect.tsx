import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { FALLBACK_LANGUAGES, LANGUAGE_LABELS, useI18n } from '../lib/i18n'
import type { Language } from '../lib/types'
import { GlobeIcon } from './icons'
import { cx } from './ui'

/**
 * Language picker. Changes apply to the UI immediately and, when signed in,
 * are persisted with PUT /api/user/language so the chat assistant answers in
 * the same language on the next visit.
 */
export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useI18n()
  const { isAuthenticated } = useAuth()
  const [languages, setLanguages] = useState<Language[]>(FALLBACK_LANGUAGES)

  useEffect(() => {
    let cancelled = false
    api
      .languages()
      .then((list) => {
        if (!cancelled && list?.length) setLanguages(list)
      })
      .catch(() => {
        // The hard-coded fallback list already matches the backend's.
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleChange(code: string) {
    setLanguage(code)
    if (!isAuthenticated) return
    try {
      await api.setLanguage(code)
    } catch {
      // A failed save only means the preference won't follow to another device.
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <GlobeIcon
        size={15}
        className="pointer-events-none absolute left-2.5 text-muted"
      />
      <select
        value={language}
        onChange={(event) => void handleChange(event.target.value)}
        aria-label="Language"
        className={cx(
          'cursor-pointer appearance-none rounded-md border border-line bg-white py-1.5 pl-8 pr-7 text-sm text-ink',
          'transition-colors hover:bg-surface focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand',
          compact && 'py-1 text-xs',
        )}
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code}>
            {LANGUAGE_LABELS[item.code] ?? item.name}
          </option>
        ))}
      </select>
      <svg
        width="10"
        height="10"
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-2.5 text-muted"
        aria-hidden="true"
      >
        <path d="M2 4.5L6 8.5l4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  )
}
