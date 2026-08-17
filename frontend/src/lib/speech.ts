/**
 * Minimal typings + helpers for the Web Speech API, which is not in the
 * standard DOM lib. Both halves are optional: Chrome/Edge have recognition,
 * most browsers have synthesis, and the UI must work without either.
 */

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResult {
  readonly length: number
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

export interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const speechRecognitionSupported = (): boolean => getRecognitionCtor() !== null

export function createRecognition(locale: string): SpeechRecognitionLike | null {
  const Ctor = getRecognitionCtor()
  if (!Ctor) return null
  const recognition = new Ctor()
  recognition.lang = locale
  recognition.continuous = false
  recognition.interimResults = false
  return recognition
}

/** Reads the transcript out of the event without assuming array methods. */
export function transcriptOf(event: Event): string {
  const typed = event as SpeechRecognitionEventLike
  if (!typed || !typed.results) return ''
  let out = ''
  const start = typeof typed.resultIndex === 'number' ? typed.resultIndex : 0
  for (let i = start; i < typed.results.length; i++) {
    const res = typed.results[i]
    if (res && res[0] && typeof res[0].transcript === 'string') {
      out += res[0].transcript
    }
  }
  return out.trim()
}

export const speechSynthesisSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window

export function speak(text: string, locale: string, onEnd?: () => void) {
  if (!speechSynthesisSupported()) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = locale
  // Slightly slower than default — these are instructions read aloud in a field.
  utterance.rate = 0.95
  if (onEnd) {
    utterance.onend = onEnd
    utterance.onerror = onEnd
  }
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (speechSynthesisSupported()) window.speechSynthesis.cancel()
}
