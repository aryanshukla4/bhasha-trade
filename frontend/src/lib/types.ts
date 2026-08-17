/**
 * Wire types for the Bhasha Trade API.
 *
 * IMPORTANT: the backend is asymmetric about casing. Request bodies are
 * camelCase (Pydantic schemas in backend/app/schemas.py), but most responses
 * come from dto() in backend/app/services/domain_service.py, which reflects
 * SQLAlchemy column names and therefore returns snake_case. The handful of
 * hand-written response dicts (the user object, verification-status, barter
 * parse, and the scheme/voice/advisory stubs) are camelCase.
 *
 * These types mirror the wire exactly. Do not "normalize" them.
 */

export type Role = 'farmer' | 'buyer' | 'dealer'

/** From AuthService.serialize() — camelCase. */
export interface User {
  id: string
  phone: string
  name: string | null
  role: Role
  preferredLanguage: string
  verificationStatus: string
}

export interface AuthSession {
  user: User
  accessToken: string
  refreshToken: string
  tokenType: string
}

export interface SendOtpResult {
  message: string
  expiresInMinutes: number
  /** Only present while APP_ENV !== 'production'. Always "123456" in dev. */
  devOtp?: string
}

export interface Language {
  code: string
  name: string
}

/** dto(MarketPrice) — snake_case. */
export interface MarketPrice {
  id: string
  commodity: string
  state: string
  district: string
  mandi_name: string
  modal_price: number
  min_price: number | null
  max_price: number | null
  latitude: number | null
  longitude: number | null
  recorded_on: string
}

export type ListingStatus = 'active' | 'reserved' | 'sold' | 'cancelled'

/** dto(ProduceListing) — snake_case. */
export interface ProduceListing {
  id: string
  farmer_id: string
  crop_type: string
  quantity: number
  unit: string
  price_per_unit: number
  description: string | null
  photo_url: string | null
  state: string | null
  district: string | null
  status: ListingStatus | string
  created_at: string
}

export type OrderStatus = 'pending' | 'accepted' | 'completed' | 'cancelled'

/** dto(Order) — snake_case. */
export interface Order {
  id: string
  listing_id: string
  buyer_id: string
  farmer_id: string
  agreed_price: number
  quantity?: number | null
  total_price?: number | null
  delivery_address?: string | null
  payment_method?: string | null
  notes?: string | null
  status: OrderStatus | string
  created_at: string
}

export type OrderAction = 'accept' | 'complete' | 'reject' | 'cancel'

/** dto(Dealer) — snake_case. items_available is a JSON object keyed by item. */
export interface Dealer {
  id: string
  user_id: string | null
  name: string
  phone: string | null
  location: string | null
  items_available: Record<string, { openToBarter?: boolean }>
  verification_status: string
}

/** dto(BarterRequest) — snake_case. */
export interface BarterRequest {
  id: string
  farmer_id: string
  item_wanted: string
  qty_wanted: number | null
  item_offered: string
  qty_offered: number | null
  raw_query_text: string | null
  status: 'open' | 'completed' | string
  created_at: string
}

export type MatchStatus = 'suggested' | 'connected' | 'confirmed'

/** dto(BarterMatch) — snake_case. */
export interface BarterMatch {
  id: string
  request_id: string
  dealer_id: string
  match_score: number
  status: MatchStatus | string
}

/** GET /api/barter/matches/{id} nests the dealer alongside the match. */
export type BarterMatchWithDealer = BarterMatch & { dealer: Dealer }

/** POST /api/barter/parse-request — hand-written dict, camelCase. */
export interface BarterParseResult {
  intent: string
  itemWanted: 'fertilizer' | 'seeds' | 'pesticide' | null
  itemOffered: 'wheat' | 'rice' | null
  needsClarification: boolean
}

/** dto(ChatLog) + sources. */
export interface ChatLog {
  id: string
  user_id: string
  query: string
  response: string
  language: string
  created_at: string
  sources?: string[]
}

/** dto(Review) — snake_case. */
export interface Review {
  id: string
  from_user_id: string
  to_user_id: string
  order_id: string | null
  rating: number
  comment: string | null
  created_at: string
}

/** dto(Notification) — snake_case. */
export interface AppNotification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  is_read: boolean
  created_at: string
}

export interface Scheme {
  id: string
  name?: string
  description?: string
}

export interface EligibilityResult {
  schemeId: string
  eligible: boolean | null
  requiresReview: boolean
}

export interface VerificationStatus {
  userId: string
  verificationStatus: string
}

export interface WeatherResult {
  location: { lat: number; lon: number }
  provider: string
  alerts: unknown[]
}

export interface CropAdvisory {
  cropType: string
  advisory: string
  source: string
}

// --- Crop disease detection ---------------------------------------------

export interface CropQualityMetrics {
  blur_score: number
  brightness: number
  green_ratio: number
}

/** A prediction from our own Keras model. Distinguished by `is_healthy`. */
export interface OwnModelPrediction {
  plant: string
  disease: string
  is_healthy: boolean
  confidence: number
}

/** A second opinion from the Kindwise API. Distinguished by `source`. */
export interface KindwisePrediction {
  source: 'kindwise_api'
  plant: string
  disease: string
  confidence: number
}

export interface KindwiseError {
  error: string
}

export interface CropQualityRejected {
  status: 'quality_rejected'
  issues: string[]
  metrics: CropQualityMetrics
  message: string
}

export interface CropDetectionOk {
  status: 'ok'
  issues: string[]
  metrics: CropQualityMetrics
  source: 'own_model'
  top_prediction: OwnModelPrediction
  top3: OwnModelPrediction[]
  fallback_triggered: boolean
  kindwise_result?: KindwisePrediction | KindwiseError
  final_recommendation: OwnModelPrediction | KindwisePrediction
}

export type CropDetectionResult = CropQualityRejected | CropDetectionOk

export function isKindwise(
  p: OwnModelPrediction | KindwisePrediction,
): p is KindwisePrediction {
  return 'source' in p
}

export function isKindwiseError(
  r: KindwisePrediction | KindwiseError | undefined,
): r is KindwiseError {
  return !!r && 'error' in r
}
