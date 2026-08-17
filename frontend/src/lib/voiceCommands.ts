/**
 * Voice command executor: takes a VoiceCommandResult from the backend
 * and performs the corresponding frontend action (navigate, prefill, speak).
 */
import type { NavigateFunction } from 'react-router-dom'
import type { VoiceCommandResult } from './types'
import { speak, speechSynthesisSupported } from './speech'

/** Storage key for passing voice prefills to pages that need them. */
const PREFILL_KEY = 'bt.voicePrefill'

export function setVoicePrefill(prefill: Record<string, string>) {
  sessionStorage.setItem(PREFILL_KEY, JSON.stringify(prefill))
}

export function getVoicePrefill(): Record<string, string> | null {
  const raw = sessionStorage.getItem(PREFILL_KEY)
  if (!raw) return null
  sessionStorage.removeItem(PREFILL_KEY)
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Execute a voice command: navigate to the right route, store prefills,
 * and optionally speak the response.
 */
export function executeVoiceCommand(
  result: VoiceCommandResult,
  navigate: NavigateFunction,
  speakResponse = true,
) {
  // Store prefill data so the target page can pick it up
  if (result.prefill && Object.keys(result.prefill).length > 0) {
    setVoicePrefill(result.prefill)
  }

  // Build the target URL with query params
  const params = new URLSearchParams()
  if (result.routeParams) {
    for (const [key, value] of Object.entries(result.routeParams)) {
      if (value) params.set(key, value)
    }
  }
  const qs = params.toString()
  const target = qs ? `${result.route}?${qs}` : result.route

  navigate(target)

  // Speak the confirmation
  if (speakResponse && result.response && speechSynthesisSupported()) {
    // Small delay so navigation settles first
    setTimeout(() => speak(result.response, detectLocale()), 300)
  }
}

/**
 * Detect the current UI language and return a BCP-47 speech locale.
 * Falls back to en-IN.
 */
function detectLocale(): string {
  const stored = localStorage.getItem('bt.language') ?? 'hi'
  const map: Record<string, string> = {
    hi: 'hi-IN',
    en: 'en-IN',
    mr: 'mr-IN',
    ta: 'ta-IN',
    te: 'te-IN',
  }
  return map[stored] ?? 'en-IN'
}
