import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckIcon,
  MicIcon,
  SendIcon,
} from './icons'
import { Button, Spinner, cx, useToast } from './ui'
import { SPEECH_LOCALES, useI18n, useT } from '../lib/i18n'
import {
  routeMagicQuery,
  type MagicAction,
} from '../lib/magicRouter'
import {
  createRecognition,
  speechRecognitionSupported,
  transcriptOf,
  type SpeechRecognitionLike,
} from '../lib/speech'

interface MagicButtonProps {
  /** Optional custom trigger button element */
  trigger?: (open: () => void) => React.ReactNode
  /** If set, shows only the trigger button without fixed positioning */
  inline?: boolean
}

type ModalState = 'idle' | 'listening' | 'processing' | 'confirmed'

export function MagicButton({ trigger, inline = false }: MagicButtonProps) {
  const t = useT()
  const { language, setLanguage } = useI18n()
  const navigate = useNavigate()
  const toast = useToast()

  const [isOpen, setIsOpen] = useState(false)
  const [modalState, setModalState] = useState<ModalState>('idle')
  const [transcript, setTranscript] = useState('')
  const [textInput, setTextInput] = useState('')
  const [detectedAction, setDetectedAction] = useState<MagicAction | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const parseTimeoutRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)
  const modalInputRef = useRef<HTMLInputElement>(null)
  const modalStateRef = useRef<ModalState>('idle')

  const micSupported = speechRecognitionSupported()
  const locale = SPEECH_LOCALES[language] ?? 'hi-IN'

  function updateModalState(state: ModalState) {
    modalStateRef.current = state
    setModalState(state)
  }

  // Clear timers and speech recognition on unmount
  useEffect(() => {
    return () => {
      clearTimers()
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
        recognitionRef.current = null
      }
    }
  }, [])

  function clearTimers() {
    if (parseTimeoutRef.current) {
      window.clearTimeout(parseTimeoutRef.current)
      parseTimeoutRef.current = null
    }
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }

  function openModal() {
    setIsOpen(true)
    updateModalState('idle')
    setTranscript('')
    setTextInput('')
    setDetectedAction(null)
    clearTimers()
  }

  function closeModal() {
    clearTimers()
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
    updateModalState('idle')
    setIsOpen(false)
  }

  function startListening(selectedLocale?: string) {
    if (!micSupported) {
      toast.error(t('magicMicUnsupported'))
      return
    }

    clearTimers()
    setTranscript('')
    setDetectedAction(null)
    updateModalState('listening')

    // Safely abort any prior running instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }

    const recLocale = typeof selectedLocale === 'string' ? selectedLocale : locale
    const recognition = createRecognition(recLocale)
    if (!recognition) {
      toast.error(t('magicMicUnsupported'))
      updateModalState('idle')
      return
    }

    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      const text = transcriptOf(event)
      if (!text) return
      setTranscript(text)
      processQuery(text)
    }

    recognition.onerror = (event: Event) => {
      const err = (event as { error?: string })?.error
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        toast.error(t('magicMicUnsupported'))
      }
      if (modalStateRef.current === 'listening') {
        updateModalState('idle')
      }
    }

    recognition.onend = () => {
      // Only reset to idle if still in listening state (not processing or confirmed)
      if (modalStateRef.current === 'listening') {
        updateModalState('idle')
      }
    }

    try {
      recognition.start()
    } catch {
      updateModalState('idle')
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
    if (modalStateRef.current === 'listening') {
      updateModalState('idle')
    }
  }

  function processQuery(queryText: string) {
    const trimmed = queryText.trim()
    if (!trimmed) return

    clearTimers()
    updateModalState('processing')

    // Stop active speech recognition cleanly
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }

    // Brief realistic parsing delay for delightful micro-interaction
    parseTimeoutRef.current = window.setTimeout(() => {
      const action = routeMagicQuery(trimmed)
      setDetectedAction(action)
      updateModalState('confirmed')

      // Start 1.8 second confirmation countdown before navigating
      let remaining = 1.8
      setCountdown(Math.ceil(remaining))

      countdownIntervalRef.current = window.setInterval(() => {
        remaining -= 0.2
        setCountdown(Math.max(0, Math.ceil(remaining)))
      }, 200)

      timeoutRef.current = window.setTimeout(() => {
        executeNavigation(action)
      }, 1800)
    }, 450)
  }

  function executeNavigation(action: MagicAction) {
    clearTimers()
    closeModal()

    // Pass structured fields to destination page via react-router state
    navigate(action.destination, {
      state: {
        fromMagic: true,
        intent: action.intent,
        prefill: action.fields,
        action: (action.fields as Record<string, unknown>).action,
        query: action.originalQuery,
        initialMessage:
          action.intent === 'weather' || action.intent === 'ask_ai'
            ? action.originalQuery
            : undefined,
      },
    })
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    if (!textInput.trim()) return
    processQuery(textInput)
  }

  function handleSuggestionClick(text: string) {
    setTextInput(text)
    processQuery(text)
  }

  const suggestions = [
    { text: t('magicSuggestion1'), icon: '🌤️' },
    { text: t('magicSuggestion2'), icon: '🌾' },
    { text: t('magicSuggestion3'), icon: '📊' },
    { text: t('magicSuggestion4'), icon: '🔄' },
    { text: t('magicSuggestion5'), icon: '🩺' },
  ]

  return (
    <>
      {/* --- CUSTOM OR DEFAULT TRIGGER BUTTON --- */}
      {trigger ? (
        trigger(openModal)
      ) : (
        <div
          className={cx(
            inline
              ? 'relative'
              : 'fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 print:hidden',
          )}
        >
          <button
            type="button"
            onClick={openModal}
            aria-label="Magic AI Button"
            className={cx(
              'group relative flex items-center gap-2.5 rounded-full p-2.5 sm:px-4.5 sm:py-3',
              'bg-gradient-to-r from-forest via-[#0c590e] to-[#126b15] text-cream',
              'border border-leaf/40 shadow-lift-lg transition-all duration-300',
              'hover:scale-105 hover:border-gold hover:shadow-glow active:scale-95',
            )}
          >
            {/* Ambient Pulse Ring */}
            <span className="absolute -inset-1 rounded-full bg-leaf/30 opacity-70 blur-xs transition group-hover:opacity-100 animate-pulse-subtle" />

            {/* Inner Glow Sparkle */}
            <span className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-cream/15 backdrop-blur-xs ring-1 ring-cream/30 group-hover:bg-cream/25">
              <span className="text-base sm:text-lg">✨</span>
            </span>

            <div className="relative hidden sm:block text-left">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-extrabold tracking-wide text-cream">
                  {t('magicButtonLabel')}
                </span>
                <span className="rounded bg-gold/90 px-1 py-0.2 text-[9px] font-bold uppercase text-soil">
                  AI
                </span>
              </div>
              <p className="text-[10px] font-medium text-leafSoft/90 mt-0.5">
                {t('magicButtonAsk')}
              </p>
            </div>

            <span className="relative hidden sm:flex h-6 w-6 items-center justify-center rounded-full bg-cream/10 text-cream group-hover:bg-cream/20">
              <MicIcon size={14} />
            </span>
          </button>
        </div>
      )}

      {/* --- MAGIC MODAL / SHEET OVERLAY --- */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={closeModal}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            className={cx(
              'relative z-10 flex w-full max-w-lg flex-col overflow-hidden',
              'rounded-t-3xl sm:rounded-3xl border border-leaf/30 bg-white/95 backdrop-blur-md shadow-modal',
              'animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200',
            )}
          >
            {/* Header with decorative agricultural accents */}
            <div className="relative overflow-hidden bg-gradient-to-r from-forest via-[#0a520c] to-[#126b15] px-5 py-4 text-cream">
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gold/20 blur-xl" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cream/15 text-lg ring-1 ring-cream/25">
                    ✨
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold tracking-tight text-cream">
                      {t('magicModalTitle')}
                    </h2>
                    <p className="text-xs text-leafSoft/90">{t('magicModalSubtitle')}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl bg-cream/10 p-2 text-cream hover:bg-cream/20 transition-colors"
                  aria-label={t('close')}
                >
                  ✕
                </button>
              </div>

              {/* Language quick switcher */}
              <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <span className="text-[10px] font-semibold text-leafSoft/80 shrink-0">
                  Voice Lang:
                </span>
                {[
                  { code: 'hi', label: 'हिन्दी' },
                  { code: 'en', label: 'English' },
                  { code: 'mr', label: 'मराठी' },
                  { code: 'ta', label: 'தமிழ்' },
                  { code: 'te', label: 'తెలుగు' },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code)
                      if (modalStateRef.current === 'listening') {
                        const newLocale = SPEECH_LOCALES[lang.code] ?? 'hi-IN'
                        startListening(newLocale)
                      }
                    }}
                    className={cx(
                      'rounded-lg px-2 py-0.5 text-[11px] font-medium transition-all shrink-0',
                      language === lang.code
                        ? 'bg-cream text-forest font-bold shadow-xs'
                        : 'bg-cream/15 text-cream hover:bg-cream/25',
                    )}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* --- 1. IDLE STATE --- */}
              {modalState === 'idle' && (
                <div className="text-center py-2 space-y-4">
                  {/* Central Voice Button */}
                  <div className="flex flex-col items-center justify-center">
                    <button
                      type="button"
                      onClick={() => startListening()}
                      disabled={!micSupported}
                      className={cx(
                        'relative flex h-20 w-20 items-center justify-center rounded-full',
                        'bg-gradient-to-br from-forest via-[#0c590e] to-[#126b15] text-cream',
                        'shadow-lift ring-4 ring-leaf/40 transition-all duration-200',
                        'hover:scale-110 hover:ring-forest hover:shadow-glow active:scale-95',
                        !micSupported && 'opacity-50 cursor-not-allowed',
                      )}
                      title={micSupported ? t('magicMicStart') : t('magicMicUnsupported')}
                    >
                      <MicIcon size={34} />
                      <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-soil text-xs font-bold shadow-xs">
                        🎙️
                      </span>
                    </button>
                    <p className="mt-3 text-sm font-bold text-ink">
                      {micSupported ? 'Tap to Speak in Any Language' : 'Type your request below'}
                    </p>
                    <p className="mt-0.5 text-xs text-muted max-w-xs">{t('magicSpeakPrompt')}</p>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="pt-2 border-t border-line/60">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted text-left">
                      Examples to try:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map(({ text, icon }) => (
                        <button
                          key={text}
                          type="button"
                          onClick={() => handleSuggestionClick(text)}
                          className="flex items-center gap-1.5 rounded-xl border border-leaf/30 bg-creamSoft/70 px-3 py-1.5 text-xs font-medium text-forest hover:border-forest hover:bg-sageSoft transition-all text-left"
                        >
                          <span>{icon}</span>
                          <span>{text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* --- 2. LISTENING STATE --- */}
              {modalState === 'listening' && (
                <div className="text-center py-6 space-y-4">
                  <div className="relative inline-flex items-center justify-center">
                    <span className="absolute h-28 w-28 rounded-full bg-leaf/40 animate-ping" />
                    <span className="absolute h-24 w-24 rounded-full bg-forest/20 animate-pulse" />
                    <button
                      type="button"
                      onClick={stopListening}
                      className="relative flex h-20 w-20 items-center justify-center rounded-full bg-forest text-cream shadow-lift ring-4 ring-gold"
                    >
                      <MicIcon size={36} className="animate-bounce" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-forest animate-pulse">
                      {t('magicListening')}
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      {transcript ? `"${transcript}"` : 'Listening for crops, quantities, weather or questions…'}
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={stopListening}
                    className="rounded-xl text-xs font-semibold"
                  >
                    {t('cancel')}
                  </Button>
                </div>
              )}

              {/* --- 3. PROCESSING STATE --- */}
              {modalState === 'processing' && (
                <div className="text-center py-8 space-y-3">
                  <Spinner size={32} className="mx-auto text-forest" />
                  <h3 className="text-base font-bold text-ink">{t('magicThinking')}</h3>
                  <p className="text-xs text-muted max-w-xs mx-auto">
                    {transcript || textInput}
                  </p>
                </div>
              )}

              {/* --- 4. CONFIRMED ACTION & ENTITY STATE --- */}
              {modalState === 'confirmed' && detectedAction && (
                <div className="space-y-4 py-1">
                  {/* Recognized Intent Banner */}
                  <div className="rounded-2xl border border-leaf/40 bg-gradient-to-br from-sageSoft/80 to-leafSoft/60 p-4 shadow-xs">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{detectedAction.icon}</span>
                        <div>
                          <h3 className="text-sm font-extrabold text-forest">
                            {detectedAction.label}
                          </h3>
                          <p className="text-xs text-muted">{detectedAction.explanation}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-forest px-2.5 py-0.5 text-[11px] font-bold text-cream">
                        <CheckIcon size={12} />
                        Matched
                      </span>
                    </div>

                    {/* Extracted Entity Badges */}
                    {detectedAction.summaryPills.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-leaf/30 space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-forest/80">
                          {t('magicExtractedEntities')}:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {detectedAction.summaryPills.map((pill, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-xl bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink border border-leaf/30 shadow-2xs"
                            >
                              {pill.icon && <span>{pill.icon}</span>}
                              <span className="text-muted text-[11px]">{pill.label}:</span>
                              <span>{pill.value}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between text-xs text-forest font-medium">
                      <span>{t('magicDestination')}:</span>
                      <span className="font-mono font-bold bg-white/80 px-2 py-0.5 rounded-lg border border-leaf/30">
                        {detectedAction.destination}
                      </span>
                    </div>
                  </div>

                  {/* Countdown action bar */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      onClick={() => executeNavigation(detectedAction)}
                      className="flex-1 rounded-xl py-2.5 font-bold shadow-xs"
                    >
                      <CheckIcon size={16} />
                      <span>{t('magicProceed')}</span>
                      {countdown !== null && (
                        <span className="ml-1 text-xs opacity-80">({countdown}s)</span>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        clearTimers()
                        updateModalState('idle')
                      }}
                      className="rounded-xl text-xs"
                    >
                      {t('magicEdit')}
                    </Button>
                  </div>
                </div>
              )}

              {/* --- BOTTOM TEXT INPUT FORM --- */}
              <form onSubmit={handleFormSubmit} className="pt-2 border-t border-line/60">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={modalInputRef}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder={t('magicPlaceholder')}
                      className="field-base rounded-xl pr-9 bg-white"
                    />
                    {textInput && (
                      <button
                        type="button"
                        onClick={() => setTextInput('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!textInput.trim() || modalState === 'processing'}
                    className="shrink-0 rounded-xl px-4"
                  >
                    <SendIcon size={16} />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
