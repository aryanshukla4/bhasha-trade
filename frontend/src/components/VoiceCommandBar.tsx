import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MicIcon } from './icons'
import { Button, cx } from './ui'
import { ApiError, api } from '../lib/api'
import { SPEECH_LOCALES, useI18n, useT } from '../lib/i18n'
import {
  createRecognition,
  speechRecognitionSupported,
  stopSpeaking,
  transcriptOf,
  type SpeechRecognitionLike,
} from '../lib/speech'
import { executeVoiceCommand } from '../lib/voiceCommands'

/**
 * Floating voice command bar — always visible at the bottom-right corner.
 * Tap the mic, speak a command, and the app navigates/auto-fills for you.
 */
export default function VoiceCommandBar() {
  const t = useT()
  const { language } = useI18n()
  const navigate = useNavigate()

  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [lastResponse, setLastResponse] = useState('')
  const [showTooltip, setShowTooltip] = useState(false)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const locale = SPEECH_LOCALES[language] ?? 'en-IN'
  const supported = speechRecognitionSupported()

  // Auto-hide tooltip after 4 seconds
  useEffect(() => {
    return () => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current)
    }
  }, [])

  const processTranscript = useCallback(
    async (text: string) => {
      if (!text.trim()) return
      setProcessing(true)
      setLastResponse('')
      try {
        const result = await api.voiceCommand(text, language)
        setLastResponse(result.response)
        executeVoiceCommand(result, navigate, true)

        // Auto-hide response after 4 seconds
        if (tooltipTimer.current) clearTimeout(tooltipTimer.current)
        tooltipTimer.current = setTimeout(() => setLastResponse(''), 4000)
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : t('voiceCommandError')
        setLastResponse(msg)
        tooltipTimer.current = setTimeout(() => setLastResponse(''), 4000)
      } finally {
        setProcessing(false)
      }
    },
    [language, navigate, t],
  )

  function toggleMic() {
    if (!supported) return

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    // Stop any ongoing TTS so it doesn't interfere
    stopSpeaking()

    const recognition = createRecognition(locale)
    if (!recognition) return
    recognition.continuous = false
    recognition.interimResults = false
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      const transcript = transcriptOf(event)
      if (transcript) {
        void processTranscript(transcript)
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

  if (!supported) return null

  return (
    <div className="fixed bottom-20 right-4 z-50 sm:bottom-6 lg:bottom-6">
      {/* Response tooltip */}
      {lastResponse && (
        <div className="mb-2 max-w-[220px] rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink shadow-lg sm:max-w-[280px] sm:text-sm">
          {lastResponse}
        </div>
      )}

      {/* Main mic button */}
      <div className="relative">
        <Button
          onClick={toggleMic}
          disabled={processing}
          className={cx(
            'h-14 w-14 rounded-full shadow-lg transition-all',
            listening
              ? 'animate-pulse bg-danger text-white hover:bg-danger'
              : processing
                ? 'bg-brand-soft text-brand animate-pulse'
                : 'bg-brand text-white hover:bg-brand-text',
          )}
          aria-label={listening ? t('voiceStopListening') : t('voiceStartListening')}
          title={t('voiceStartListening')}
        >
          <MicIcon size={22} />
        </Button>

        {/* Pulsing ring when listening */}
        {listening && (
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-danger/30" />
        )}
      </div>
    </div>
  )
}
