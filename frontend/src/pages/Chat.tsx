import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { LeafIcon, MicIcon, SendIcon, SpeakerIcon } from '../components/icons'
import {
  Badge,
  Button,
  Card,
  InfoNote,
  Spinner,
  cx,
  useToast,
} from '../components/ui'
import { ApiError, api } from '../lib/api'
import { timeOnly } from '../lib/format'
import { SPEECH_LOCALES, useI18n, useT } from '../lib/i18n'
import {
  createRecognition,
  speak,
  speechRecognitionSupported,
  speechSynthesisSupported,
  stopSpeaking,
  transcriptOf,
  type SpeechRecognitionLike,
} from '../lib/speech'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  at: string
  sources?: string[]
}

/**
 * The Groq assistant replies in light markdown — mostly **bold** around prices
 * and crop names. Rendering the raw text would show the asterisks, so split on
 * them and emit real elements. Deliberately not a markdown parser: building
 * React nodes (never dangerouslySetInnerHTML) keeps model output inert.
 */
function renderText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={index} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )
}

export default function Chat() {
  const t = useT()
  const { language } = useI18n()
  const toast = useToast()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [listening, setListening] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const locale = SPEECH_LOCALES[language] ?? 'en-IN'
  const micSupported = speechRecognitionSupported()

  const location = useLocation()
  const initialSentRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    api
      .chatHistory()
      .then((logs) => {
        if (cancelled) return
        // Each ChatLog holds one exchange; expand it into two bubbles.
        const expanded = [...logs]
          .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
          .flatMap<Message>((log) => [
            { id: `${log.id}-q`, role: 'user', text: log.query, at: log.created_at },
            {
              id: `${log.id}-a`,
              role: 'assistant',
              text: log.response,
              at: log.created_at,
              sources: log.sources,
            },
          ])
        setMessages(expanded)

        // If navigated from Magic Button with a query, auto-send once
        const initMsg = (location.state as { initialMessage?: string; query?: string } | null)?.initialMessage ||
          (location.state as { initialMessage?: string; query?: string } | null)?.query
        if (initMsg && !initialSentRef.current) {
          initialSentRef.current = true
          void send(initMsg)
        }
      })
      .catch(() => {
        // An empty transcript is a fine starting state.
        const initMsg = (location.state as { initialMessage?: string; query?: string } | null)?.initialMessage ||
          (location.state as { initialMessage?: string; query?: string } | null)?.query
        if (initMsg && !initialSentRef.current) {
          initialSentRef.current = true
          void send(initMsg)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false)
      })
    return () => {
      cancelled = true
      stopSpeaking()
    }
  }, [location.state])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  async function send(text: string) {
    const question = text.trim()
    if (!question || sending) return

    const stamp = new Date().toISOString()
    setMessages((current) => [
      ...current,
      { id: `local-${stamp}`, role: 'user', text: question, at: stamp },
    ])
    setInput('')
    setSending(true)

    try {
      const log = await api.ask({ text: question, language })
      setMessages((current) => [
        ...current,
        {
          id: log.id,
          role: 'assistant',
          text: log.response,
          at: log.created_at,
          sources: log.sources,
        },
      ])
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void send(input)
  }

  function toggleMic() {
    if (!micSupported) {
      toast.error(t('chatMicUnsupported'))
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const recognition = createRecognition(locale)
    if (!recognition) return
    recognitionRef.current = recognition

    recognition.onresult = async (event) => {
      const transcript = transcriptOf(event)
      if (!transcript) return
      try {
        // Route through the backend's voice-to-text so the exchange is
        // recorded server-side, then ask with whatever text it returns.
        const result = await api.voiceToText(transcript, language)
        await send(result.text)
      } catch {
        await send(transcript)
      }
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    try {
      recognition.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }

  async function readAloud(message: Message) {
    if (speakingId === message.id) {
      stopSpeaking()
      setSpeakingId(null)
      return
    }
    setSpeakingId(message.id)
    // The backend endpoint currently returns audioUrl: null, so we never wait
    // on it — the browser voice starts immediately and the call is fire-and-
    // forget, kept so the server sees the request.
    void api.textToVoice(message.text, language).catch(() => undefined)
    speak(message.text, locale, () => setSpeakingId(null))
  }

  const suggestions = [t('chatSuggestion1'), t('chatSuggestion2'), t('chatSuggestion3')]

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[32rem] flex-col lg:h-[calc(100vh-11rem)]">
      {/* Header bar with status indicator */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {t('chatTitle')}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-leafSoft px-2.5 py-0.5 text-xs font-semibold text-forest border border-leaf/40">
              <span className="h-2 w-2 rounded-full bg-forest animate-pulse" />
              Bhasha AI
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">{t('chatSubtitle')}</p>
        </div>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border border-leaf/30 shadow-card bg-cream/40 backdrop-blur-xs">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {loadingHistory ? (
            <div className="flex justify-center py-16">
              <Spinner className="text-forest" size={24} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-sageSoft to-leafSoft text-forest shadow-xs ring-4 ring-leaf/20">
                <LeafIcon size={30} />
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-forest text-cream text-[10px]">
                  ✨
                </span>
              </div>
              <h2 className="text-lg font-bold text-ink">
                How can I help with your farming today?
              </h2>
              <p className="mb-6 mt-1 max-w-md text-xs sm:text-sm text-muted leading-relaxed">
                {t('chatEmpty')}
              </p>
              <div className="flex flex-wrap justify-center gap-2.5 max-w-xl">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="group flex items-center gap-2 rounded-2xl border border-leaf/30 bg-white/90 px-3.5 py-2 text-xs font-medium text-forest shadow-2xs transition-all duration-150 hover:-translate-y-0.5 hover:border-forest hover:bg-creamSoft hover:shadow-xs"
                  >
                    <span className="text-muted group-hover:text-forest">🌱</span>
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cx(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                <div className={cx('max-w-[85%] sm:max-w-[75%]')}>
                  {message.role === 'assistant' && (
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-forest">
                      <span>🌱</span>
                      <span>Bhasha AI</span>
                    </div>
                  )}
                  <div
                    className={cx(
                      'rounded-2xl px-4.5 py-3 text-sm shadow-sm leading-relaxed',
                      message.role === 'user'
                        ? 'rounded-tr-xs bg-gradient-to-r from-forest to-[#0c590e] text-cream'
                        : 'rounded-tl-xs border border-leaf/40 bg-white/95 text-ink',
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.role === 'assistant' ? renderText(message.text) : message.text}
                    </p>
                  </div>

                  <div
                    className={cx(
                      'mt-1 flex items-center gap-2',
                      message.role === 'user' ? 'justify-end' : 'justify-start',
                    )}
                  >
                    <span className="text-[11px] text-muted">{timeOnly(message.at)}</span>
                    {message.role === 'assistant' && speechSynthesisSupported() && (
                      <button
                        type="button"
                        onClick={() => void readAloud(message)}
                        className={cx(
                          'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium transition-colors hover:bg-leafSoft',
                          speakingId === message.id ? 'bg-leafSoft text-forest font-bold' : 'text-muted hover:text-forest',
                        )}
                        aria-label={
                          speakingId === message.id ? t('chatStopSpeaking') : t('chatSpeak')
                        }
                        title={
                          speakingId === message.id ? t('chatStopSpeaking') : t('chatSpeak')
                        }
                      >
                        <SpeakerIcon size={13} />
                        <span className="text-[10px]">{speakingId === message.id ? 'Playing' : 'Listen'}</span>
                      </button>
                    )}
                  </div>

                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="text-[11px] font-medium text-muted">{t('chatSources')}:</span>
                      {message.sources.map((source) => (
                        <Badge key={source} tone="green" className="text-[10px]">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2.5 rounded-2xl border border-leaf/40 bg-white/90 px-4 py-3 shadow-xs">
                <Spinner size={15} className="text-forest" />
                <span className="text-xs font-medium text-forest">Bhasha AI is thinking…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {listening && (
          <div className="px-4">
            <InfoNote tone="green" className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-forest animate-ping" />
              <span>{t('chatListening')}</span>
            </InfoNote>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2.5 border-t border-line/70 bg-white/80 p-3.5 backdrop-blur-sm">
          <Button
            type="button"
            onClick={toggleMic}
            variant={listening ? 'primary' : 'secondary'}
            aria-label={listening ? t('chatMicStop') : t('chatMicStart')}
            title={micSupported ? t('chatMicStart') : t('chatMicUnsupported')}
            disabled={!micSupported}
            className={cx(
              'shrink-0 h-10 w-10 !p-0 rounded-xl transition-all',
              listening && 'ring-4 ring-forest/30',
            )}
          >
            <MicIcon size={17} />
          </Button>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t('chatPlaceholder')}
            className="field-base flex-1 rounded-xl bg-white focus:bg-white"
            aria-label={t('chatPlaceholder')}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!input.trim() || sending}
            className="shrink-0 rounded-xl px-4 py-2 font-semibold shadow-xs"
          >
            <SendIcon size={16} />
            <span className="hidden sm:inline ml-1">{t('chatSend')}</span>
          </Button>
        </form>
      </Card>
    </div>
  )
}
