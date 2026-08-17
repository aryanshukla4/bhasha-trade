import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import en, { type TranslationKey, type Translations } from './locales/en'
import hi from './locales/hi'
import mr from './locales/mr'
import ta from './locales/ta'
import te from './locales/te'

const BUNDLES: Record<string, Translations> = { en, hi, mr, ta, te }

/** Mirrors GET /api/languages; used before that call resolves. */
export const FALLBACK_LANGUAGES = [
  { code: 'hi', name: 'Hindi' },
  { code: 'en', name: 'English' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
]

/** Endonyms, so the picker reads in the language it offers. */
export const LANGUAGE_LABELS: Record<string, string> = {
  hi: 'हिन्दी',
  en: 'English',
  mr: 'मराठी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
}

const STORAGE_KEY = 'bt.language'

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string

interface I18nValue {
  language: string
  setLanguage: (code: string) => void
  t: Translate
}

const I18nContext = createContext<I18nValue | null>(null)

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match,
  )
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? 'hi',
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((code: string) => {
    // The backend accepts any string here, but we only have bundles for five.
    setLanguageState(BUNDLES[code] ? code : 'en')
  }, [])

  const t = useCallback<Translate>(
    (key, vars) => {
      const bundle = BUNDLES[language] ?? en
      return interpolate(bundle[key] ?? en[key] ?? key, vars)
    },
    [language],
  )

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}

/** Convenience for components that only need the translate function. */
export function useT(): Translate {
  return useI18n().t
}

/** BCP-47 tags for SpeechRecognition / speechSynthesis. */
export const SPEECH_LOCALES: Record<string, string> = {
  hi: 'hi-IN',
  en: 'en-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  te: 'te-IN',
}
