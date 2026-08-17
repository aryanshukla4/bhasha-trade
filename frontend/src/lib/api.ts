/**
 * Thin fetch wrapper for the Bhasha Trade API.
 *
 * Handles the three things the backend does that trip people up:
 *   - success bodies are enveloped as {"data": ...}, errors are NOT (they are
 *     {"detail": ...}, and FastAPI 422s make `detail` an array of objects)
 *   - 204 routes (DELETE produce, logout) return no body at all
 *   - access tokens expire, so a 401 gets one refresh + retry before failing
 *
 * All paths are same-origin and relative; vite.config.ts proxies them to the
 * FastAPI server so no CORS preflight ever happens.
 */

import type {
  AuthSession,
  BarterMatch,
  BarterMatchWithDealer,
  BarterParseResult,
  BarterRequest,
  ChatLog,
  CropAdvisory,
  CropDetectionResult,
  Dealer,
  EligibilityResult,
  Language,
  MarketPrice,
  AppNotification,
  Order,
  OrderAction,
  ProduceListing,
  Review,
  Role,
  Scheme,
  SendOtpResult,
  User,
  VerificationStatus,
  VoiceCommandResult,
  WeatherResult,
} from './types'

const ACCESS_KEY = 'bt.accessToken'
const REFRESH_KEY = 'bt.refreshToken'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const tokens = {
  access: () => localStorage.getItem(ACCESS_KEY),
  refresh: () => localStorage.getItem(REFRESH_KEY),
  set(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS_KEY, accessToken)
    localStorage.setItem(REFRESH_KEY, refreshToken)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

/** Called when a refresh fails, so the app can drop back to the login screen. */
let onAuthLost: () => void = () => {}
export function setAuthLostHandler(fn: () => void) {
  onAuthLost = fn
}

/** FastAPI's `detail` is either a string or a list of validation objects. */
function flattenDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const parts = detail
      .map((d) => {
        if (d && typeof d === 'object' && 'msg' in d) {
          const loc = Array.isArray((d as { loc?: unknown[] }).loc)
            ? (d as { loc: unknown[] }).loc.filter((p) => p !== 'body').join('.')
            : ''
          const msg = String((d as { msg: unknown }).msg)
          return loc ? `${loc}: ${msg}` : msg
        }
        return null
      })
      .filter(Boolean)
    if (parts.length) return parts.join('; ')
  }
  return fallback
}

async function readError(res: Response): Promise<ApiError> {
  const fallback = `Request failed (${res.status})`
  try {
    const body = await res.json()
    return new ApiError(res.status, flattenDetail(body?.detail, fallback))
  } catch {
    return new ApiError(res.status, fallback)
  }
}

interface RequestOptions {
  method?: string
  /** JSON body. Ignored when `form` is set. */
  body?: unknown
  /** Multipart body, for the crop photo upload. */
  form?: FormData
  /** Skip the Authorization header (used by the auth endpoints themselves). */
  anonymous?: boolean
  query?: Record<string, string | number | undefined | null>
}

function withQuery(path: string, query?: RequestOptions['query']): string {
  if (!query) return path
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

async function rawRequest(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {}
  if (!options.anonymous) {
    const token = tokens.access()
    // Exactly one space — the backend slices authorization[7:].
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  let body: BodyInit | undefined
  if (options.form) {
    body = options.form // let the browser set the multipart boundary
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }
  return fetch(withQuery(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body,
  })
}

/** Serialises concurrent refreshes so a burst of 401s only rotates once. */
let refreshInFlight: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  const refreshToken = tokens.refresh()
  if (!refreshToken) return false
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await rawRequest('/api/auth/refresh', {
          method: 'POST',
          body: { refreshToken },
          anonymous: true,
        })
        if (!res.ok) return false
        const payload = (await res.json())?.data as AuthSession | undefined
        if (!payload?.accessToken) return false
        tokens.set(payload.accessToken, payload.refreshToken)
        return true
      } catch {
        return false
      } finally {
        // Cleared on the next tick so parallel callers share this result.
        setTimeout(() => {
          refreshInFlight = null
        }, 0)
      }
    })()
  }
  return refreshInFlight
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await rawRequest(path, options)

  if (res.status === 401 && !options.anonymous) {
    const refreshed = await refreshSession()
    if (refreshed) {
      res = await rawRequest(path, options)
    } else {
      tokens.clear()
      onAuthLost()
      throw await readError(res)
    }
  }

  if (!res.ok) throw await readError(res)

  // 204 (DELETE produce, logout) has no body — don't try to parse it.
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
  }
  const payload = await res.json()
  return payload?.data as T
}

// --- Auth ----------------------------------------------------------------

export const api = {
  health: () => request<{ status: string; service: string }>('/health', { anonymous: true }),

  sendOtp: (phone: string) =>
    request<SendOtpResult>('/api/auth/send-otp', {
      method: 'POST',
      body: { phone },
      anonymous: true,
    }),

  verifyOtp: (payload: {
    phone: string
    otp: string
    name?: string
    role?: Role
    preferredLanguage?: string
  }) =>
    request<AuthSession>('/api/auth/verify-otp', {
      method: 'POST',
      body: payload,
      anonymous: true,
    }),

  logout: (refreshToken: string | null) =>
    request<void>('/api/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      anonymous: true,
    }),

  me: () => request<User>('/api/auth/me'),

  updateProfile: (payload: {
    name?: string
    preferredLanguage?: string
    latitude?: number
    longitude?: number
    location?: string
  }) => request<User>('/api/auth/profile', { method: 'PUT', body: payload }),

  // --- Languages ---------------------------------------------------------

  languages: () => request<Language[]>('/api/languages', { anonymous: true }),

  setLanguage: (language: string) =>
    request<{ preferredLanguage: string }>('/api/user/language', {
      method: 'PUT',
      body: { language },
    }),

  // --- Market ------------------------------------------------------------

  marketPrices: (filters?: { commodity?: string; state?: string; district?: string }) =>
    request<MarketPrice[]>('/api/market/prices', { anonymous: true, query: filters }),

  marketTrends: (commodity: string) =>
    request<MarketPrice[]>(`/api/market/trends/${encodeURIComponent(commodity)}`, {
      anonymous: true,
    }),

  nearbyMandis: (lat: number, lon: number) =>
    request<MarketPrice[]>('/api/market/nearby-mandis', {
      anonymous: true,
      query: { lat, lon },
    }),

  // --- Produce -----------------------------------------------------------

  listings: (filters?: { cropType?: string; state?: string }) =>
    request<ProduceListing[]>('/api/produce', { anonymous: true, query: filters }),

  listing: (id: string) =>
    request<ProduceListing>(`/api/produce/${encodeURIComponent(id)}`, { anonymous: true }),

  createListing: (payload: {
    cropType: string
    quantity: number
    unit: string
    pricePerUnit: number
    description?: string
    photoUrl?: string
    state?: string
    district?: string
  }) => request<ProduceListing>('/api/produce', { method: 'POST', body: payload }),

  updateListing: (
    id: string,
    payload: Partial<{
      cropType: string
      quantity: number
      unit: string
      pricePerUnit: number
      description: string
      photoUrl: string
      state: string
      district: string
      status: string
    }>,
  ) =>
    request<ProduceListing>(`/api/produce/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
    }),

  deleteListing: (id: string) =>
    request<void>(`/api/produce/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  expressInterest: (id: string, offeredPrice?: number) =>
    request<Order>(`/api/produce/${encodeURIComponent(id)}/interest`, {
      method: 'POST',
      body: offeredPrice ? { offeredPrice } : {},
    }),

  // --- Orders ------------------------------------------------------------

  orders: () => request<Order[]>('/api/orders'),

  order: (id: string) => request<Order>(`/api/orders/${encodeURIComponent(id)}`),

  orderAction: (id: string, action: OrderAction) =>
    request<Order>(`/api/orders/${encodeURIComponent(id)}/${action}`, { method: 'POST' }),

  // --- Barter ------------------------------------------------------------

  parseBarter: (text: string) =>
    request<BarterParseResult>('/api/barter/parse-request', {
      method: 'POST',
      body: { text },
    }),

  createBarterRequest: (payload: {
    itemWanted: string
    itemOffered: string
    qtyWanted?: number
    qtyOffered?: number
    rawQueryText?: string
  }) => request<BarterRequest>('/api/barter/request', { method: 'POST', body: payload }),

  barterHistory: () => request<BarterRequest[]>('/api/barter/history'),

  dealers: (filters?: { item?: string; location?: string }) =>
    request<Dealer[]>('/api/barter/dealers', { anonymous: true, query: filters }),

  barterMatches: (requestId: string) =>
    request<BarterMatchWithDealer[]>(`/api/barter/matches/${encodeURIComponent(requestId)}`),

  barterConnect: (requestId: string, dealerId: string) =>
    request<BarterMatch>(`/api/barter/${encodeURIComponent(requestId)}/connect`, {
      method: 'POST',
      body: { dealerId },
    }),

  barterConfirm: (requestId: string, dealerId: string) =>
    request<BarterMatch>(`/api/barter/${encodeURIComponent(requestId)}/confirm`, {
      method: 'POST',
      body: { dealerId },
    }),

  // --- Chat --------------------------------------------------------------

  ask: (payload: { text?: string; transcript?: string; language?: string }) =>
    request<ChatLog>('/api/chat/ask', { method: 'POST', body: payload }),

  chatHistory: () => request<ChatLog[]>('/api/chat/history'),

  voiceToText: (transcript: string, language?: string) =>
    request<{ text: string; language: string }>('/api/chat/voice-to-text', {
      method: 'POST',
      body: { transcript, language },
    }),

  textToVoice: (text: string, language?: string) =>
    request<{ text: string; language: string; audioUrl: string | null }>(
      '/api/chat/text-to-voice',
      { method: 'POST', body: { text, language } },
    ),

  // --- Voice commands ----------------------------------------------------

  voiceCommand: (text: string, language?: string) =>
    request<VoiceCommandResult>('/api/voice/command', {
      method: 'POST',
      body: { text, language },
    }),

  // --- Crop --------------------------------------------------------------

  detectDisease: (file: File) => {
    const form = new FormData()
    // Field name must be exactly "photo" — anything else is a 422.
    form.append('photo', file)
    return request<CropDetectionResult>('/api/crop/detect-disease', {
      method: 'POST',
      form,
    })
  },

  cropAdvisory: (cropType: string) =>
    request<CropAdvisory>(`/api/crop/advisory/${encodeURIComponent(cropType)}`),

  // --- Weather / schemes / reviews / notifications ------------------------

  weather: (lat: number, lon: number) =>
    request<WeatherResult>('/api/weather', { anonymous: true, query: { lat, lon } }),

  schemes: () => request<Scheme[]>('/api/schemes', { anonymous: true }),

  scheme: (id: string) =>
    request<Scheme>(`/api/schemes/${encodeURIComponent(id)}`, { anonymous: true }),

  checkEligibility: (id: string) =>
    request<EligibilityResult>(`/api/schemes/${encodeURIComponent(id)}/check-eligibility`, {
      method: 'POST',
    }),

  reviewsFor: (userId: string) =>
    request<Review[]>(`/api/reviews/${encodeURIComponent(userId)}`, { anonymous: true }),

  createReview: (payload: {
    toUserId: string
    orderId?: string
    rating: number
    comment?: string
  }) => request<Review>('/api/reviews', { method: 'POST', body: payload }),

  verificationStatus: (userId: string) =>
    request<VerificationStatus>(
      `/api/users/${encodeURIComponent(userId)}/verification-status`,
      { anonymous: true },
    ),

  notifications: () => request<AppNotification[]>('/api/notifications'),

  subscribeNotifications: (endpoint: string) =>
    request<{ subscribed: boolean }>('/api/notifications/subscribe', {
      method: 'POST',
      body: { endpoint },
    }),
}
