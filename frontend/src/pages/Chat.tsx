import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ChatIcon, MicIcon, SendIcon, SpeakerIcon } from '../components/icons'
import {
  Badge,
  Button,
  Card,
  InfoNote,
  PageHeader,
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
      })
      .catch(() => {
        // An empty transcript is a fine starting state.
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false)
      })
    return () => {
      cancelled = true
      stopSpeaking()
    }
  }, [])

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
    <div className="flex h-[calc(100vh-13rem)] min-h-[30rem] flex-col lg:h-[calc(100vh-11rem)]">
      <PageHeader title={t('chatTitle')} subtitle={t('chatSubtitle')} />

      <Card className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {loadingHistory ? (
            <div className="flex justify-center py-10">
              <Spinner className="text-muted" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
                <ChatIcon size={22} />
              </span>
              <p className="mb-5 max-w-sm text-sm text-muted">{t('chatEmpty')}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-brand hover:bg-brand-soft"
                  >
                    {suggestion}
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
                  <div
                    className={cx(
                      'rounded-lg px-3.5 py-2.5 text-sm',
                      message.role === 'user'
                        ? 'bg-brand text-white'
                        : 'border border-line bg-surface text-ink',
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
                          'rounded p-1 transition-colors hover:bg-surface',
                          speakingId === message.id ? 'text-brand' : 'text-muted',
                        )}
                        aria-label={
                          speakingId === message.id ? t('chatStopSpeaking') : t('chatSpeak')
                        }
                        title={
                          speakingId === message.id ? t('chatStopSpeaking') : t('chatSpeak')
                        }
                      >
                        <SpeakerIcon size={14} />
                      </button>
                    )}
                  </div>

                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="text-[11px] text-muted">{t('chatSources')}:</span>
                      {message.sources.map((source) => (
                        <Badge key={source} tone="green" className="text-[11px]">
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
              <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2.5">
                <Spinner size={14} className="text-muted" />
                <span className="text-sm text-muted">{t('loading')}</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {listening && (
          <div className="px-4">
            <InfoNote tone="green" className="mb-2">
              {t('chatListening')}
            </InfoNote>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-line p-3">
          <Button
            type="button"
            onClick={toggleMic}
            variant={listening ? 'primary' : 'secondary'}
            aria-label={listening ? t('chatMicStop') : t('chatMicStart')}
            title={micSupported ? t('chatMicStart') : t('chatMicUnsupported')}
            disabled={!micSupported}
          >
            <MicIcon size={16} />
          </Button>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t('chatPlaceholder')}
            className="field-base flex-1"
            aria-label={t('chatPlaceholder')}
          />
          <Button type="submit" variant="primary" disabled={!input.trim() || sending}>
            <SendIcon size={16} />
            <span className="hidden sm:inline">{t('chatSend')}</span>
          </Button>
        </form>
      </Card>
    </div>
  )
}
