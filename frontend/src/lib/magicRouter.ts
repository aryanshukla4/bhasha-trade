/**
 * Multilingual AI Intent Router & Entity Extractor for Bhasha Trade Magic AI.
 *
 * Fully frontend, safe, deterministic and rule-guided.
 * Maps natural vernacular (Hindi, English, Hinglish, Marathi) spoken or typed queries
 * to structured intents, destinations, and extracted form entities.
 */

export type MagicIntent =
  | 'weather'
  | 'ask_ai'
  | 'sell_produce'
  | 'buy_produce'
  | 'market_prices'
  | 'barter'
  | 'orders'
  | 'schemes'
  | 'crop_doctor'
  | 'notifications'
  | 'dashboard'
  | 'profile'

export interface ExtractedProduceFields {
  cropType?: string
  quantity?: number
  unit?: string
  pricePerUnit?: number
  state?: string
  district?: string
  description?: string
}

export interface ExtractedBarterFields {
  rawQuery?: string
  itemWanted?: 'fertilizer' | 'seeds' | 'pesticide' | string
  itemOffered?: 'wheat' | 'rice' | string
  qtyWanted?: number
  qtyOffered?: number
}

export interface ExtractedMarketFields {
  commodity?: string
  state?: string
  district?: string
}

export interface ExtractedCropFields {
  cropType?: string
  concern?: string
}

export interface ExtractedOrderFields {
  tab?: 'buyer' | 'seller'
}

export interface ExtractedChatFields {
  message: string
}

export type ExtractedFields =
  | ExtractedProduceFields
  | ExtractedBarterFields
  | ExtractedMarketFields
  | ExtractedCropFields
  | ExtractedOrderFields
  | ExtractedChatFields
  | Record<string, unknown>

export interface MagicAction {
  intent: MagicIntent
  destination: string
  label: string
  icon: string
  confidence: number
  explanation: string
  summaryPills: Array<{ label: string; value: string; icon?: string }>
  fields: ExtractedFields
  originalQuery: string
}

/**
 * Hardcoded frontend-safe route registry.
 * Strictly maps known intents to verified application paths.
 */
export const SAFE_ROUTE_MAP: Record<MagicIntent, string> = {
  dashboard: '/',
  market_prices: '/market',
  sell_produce: '/produce',
  buy_produce: '/produce',
  orders: '/orders',
  barter: '/barter',
  ask_ai: '/chat',
  weather: '/chat',
  crop_doctor: '/crop',
  schemes: '/schemes',
  notifications: '/notifications',
  profile: '/profile',
}

// --------------------------------------------------------------------------
// Entity Normalization Dictionaries
// --------------------------------------------------------------------------

interface EntityMatch {
  canonical: string
  displayName: string
  icon?: string
}

const CROP_DICTIONARY: Record<string, EntityMatch> = {
  // Wheat
  wheat: { canonical: 'Wheat', displayName: 'Wheat (गेहूं)', icon: '🌾' },
  gehun: { canonical: 'Wheat', displayName: 'Wheat (गेहूं)', icon: '🌾' },
  gehu: { canonical: 'Wheat', displayName: 'Wheat (गेहूं)', icon: '🌾' },
  गेहूं: { canonical: 'Wheat', displayName: 'Wheat (गेहूं)', icon: '🌾' },
  गेहू: { canonical: 'Wheat', displayName: 'Wheat (गेहूं)', icon: '🌾' },
  कनक: { canonical: 'Wheat', displayName: 'Wheat (गेहूं)', icon: '🌾' },
  गहू: { canonical: 'Wheat', displayName: 'Wheat (गेहूं)', icon: '🌾' },

  // Rice / Paddy
  rice: { canonical: 'Rice', displayName: 'Rice (चावल)', icon: '🍚' },
  paddy: { canonical: 'Paddy', displayName: 'Paddy (धान)', icon: '🌾' },
  chawal: { canonical: 'Rice', displayName: 'Rice (चावल)', icon: '🍚' },
  dhan: { canonical: 'Paddy', displayName: 'Paddy (धान)', icon: '🌾' },
  चावल: { canonical: 'Rice', displayName: 'Rice (चावल)', icon: '🍚' },
  धान: { canonical: 'Paddy', displayName: 'Paddy (धान)', icon: '🌾' },
  भात: { canonical: 'Rice', displayName: 'Rice (चावल)', icon: '🍚' },

  // Tomato
  tomato: { canonical: 'Tomato', displayName: 'Tomato (टमाटर)', icon: '🍅' },
  tomatoes: { canonical: 'Tomato', displayName: 'Tomato (टमाटर)', icon: '🍅' },
  tamatar: { canonical: 'Tomato', displayName: 'Tomato (टमाटर)', icon: '🍅' },
  टमाटर: { canonical: 'Tomato', displayName: 'Tomato (टमाटर)', icon: '🍅' },

  // Potato
  potato: { canonical: 'Potato', displayName: 'Potato (आलू)', icon: '🥔' },
  potatoes: { canonical: 'Potato', displayName: 'Potato (आलू)', icon: '🥔' },
  aloo: { canonical: 'Potato', displayName: 'Potato (आलू)', icon: '🥔' },
  aalu: { canonical: 'Potato', displayName: 'Potato (आलू)', icon: '🥔' },
  आलू: { canonical: 'Potato', displayName: 'Potato (आलू)', icon: '🥔' },
  बटाटा: { canonical: 'Potato', displayName: 'Potato (आलू)', icon: '🥔' },

  // Onion
  onion: { canonical: 'Onion', displayName: 'Onion (प्याज)', icon: '🧅' },
  onions: { canonical: 'Onion', displayName: 'Onion (प्याज)', icon: '🧅' },
  pyaz: { canonical: 'Onion', displayName: 'Onion (प्याज)', icon: '🧅' },
  pyaaj: { canonical: 'Onion', displayName: 'Onion (प्याज)', icon: '🧅' },
  kanda: { canonical: 'Onion', displayName: 'Onion (प्याज)', icon: '🧅' },
  प्याज: { canonical: 'Onion', displayName: 'Onion (प्याज)', icon: '🧅' },
  कांदा: { canonical: 'Onion', displayName: 'Onion (प्याज)', icon: '🧅' },

  // Cotton
  cotton: { canonical: 'Cotton', displayName: 'Cotton (कपास)', icon: '☁️' },
  kapas: { canonical: 'Cotton', displayName: 'Cotton (कपास)', icon: '☁️' },
  kapaas: { canonical: 'Cotton', displayName: 'Cotton (कपास)', icon: '☁️' },
  कपास: { canonical: 'Cotton', displayName: 'Cotton (कपास)', icon: '☁️' },

  // Soybean
  soybean: { canonical: 'Soybean', displayName: 'Soybean (सोयाबीन)', icon: '🌱' },
  soyabean: { canonical: 'Soybean', displayName: 'Soybean (सोयाबीन)', icon: '🌱' },
  soya: { canonical: 'Soybean', displayName: 'Soybean (सोयाबीन)', icon: '🌱' },
  सोयाबीन: { canonical: 'Soybean', displayName: 'Soybean (सोयाबीन)', icon: '🌱' },

  // Mustard
  mustard: { canonical: 'Mustard', displayName: 'Mustard (सरसों)', icon: '🌼' },
  sarson: { canonical: 'Mustard', displayName: 'Mustard (सरसों)', icon: '🌼' },
  sarso: { canonical: 'Mustard', displayName: 'Mustard (सरसों)', icon: '🌼' },
  rai: { canonical: 'Mustard', displayName: 'Mustard (सरसों)', icon: '🌼' },
  सरसों: { canonical: 'Mustard', displayName: 'Mustard (सरसों)', icon: '🌼' },
  राई: { canonical: 'Mustard', displayName: 'Mustard (सरसों)', icon: '🌼' },

  // Maize / Corn
  maize: { canonical: 'Maize', displayName: 'Maize (मक्का)', icon: '🌽' },
  corn: { canonical: 'Maize', displayName: 'Maize (मक्का)', icon: '🌽' },
  makka: { canonical: 'Maize', displayName: 'Maize (मक्का)', icon: '🌽' },
  makki: { canonical: 'Maize', displayName: 'Maize (मक्का)', icon: '🌽' },
  bhutta: { canonical: 'Maize', displayName: 'Maize (मक्का)', icon: '🌽' },
  मक्का: { canonical: 'Maize', displayName: 'Maize (मक्का)', icon: '🌽' },
  मक्की: { canonical: 'Maize', displayName: 'Maize (मक्का)', icon: '🌽' },
  भुट्टा: { canonical: 'Maize', displayName: 'Maize (मक्का)', icon: '🌽' },

  // Sugarcane
  sugarcane: { canonical: 'Sugarcane', displayName: 'Sugarcane (गन्ना)', icon: '🎋' },
  ganna: { canonical: 'Sugarcane', displayName: 'Sugarcane (गन्ना)', icon: '🎋' },
  गन्ना: { canonical: 'Sugarcane', displayName: 'Sugarcane (गन्ना)', icon: '🎋' },
  ऊस: { canonical: 'Sugarcane', displayName: 'Sugarcane (गन्ना)', icon: '🎋' },

  // Chilli
  chilli: { canonical: 'Chilli', displayName: 'Chilli (मिर्च)', icon: '🌶️' },
  chili: { canonical: 'Chilli', displayName: 'Chilli (मिर्च)', icon: '🌶️' },
  chillies: { canonical: 'Chilli', displayName: 'Chilli (मिर्च)', icon: '🌶️' },
  mirch: { canonical: 'Chilli', displayName: 'Chilli (मिर्च)', icon: '🌶️' },
  mirchi: { canonical: 'Chilli', displayName: 'Chilli (मिर्च)', icon: '🌶️' },
  मिर्च: { canonical: 'Chilli', displayName: 'Chilli (मिर्च)', icon: '🌶️' },
  मिर्ची: { canonical: 'Chilli', displayName: 'Chilli (मिर्च)', icon: '🌶️' },

  // Garlic / Ginger
  garlic: { canonical: 'Garlic', displayName: 'Garlic (लहसुन)', icon: '🧄' },
  lahsun: { canonical: 'Garlic', displayName: 'Garlic (लहसुन)', icon: '🧄' },
  lehsun: { canonical: 'Garlic', displayName: 'Garlic (लहसुन)', icon: '🧄' },
  लहसुन: { canonical: 'Garlic', displayName: 'Garlic (लहसुन)', icon: '🧄' },
  ginger: { canonical: 'Ginger', displayName: 'Ginger (अदरक)', icon: '🫚' },
  adrak: { canonical: 'Ginger', displayName: 'Ginger (अदरक)', icon: '🫚' },
  अदरक: { canonical: 'Ginger', displayName: 'Ginger (अदरक)', icon: '🫚' },

  // Gram / Pulses
  gram: { canonical: 'Gram', displayName: 'Gram (चना)', icon: '🫘' },
  chana: { canonical: 'Gram', displayName: 'Gram (चना)', icon: '🫘' },
  चना: { canonical: 'Gram', displayName: 'Gram (चना)', icon: '🫘' },
  tur: { canonical: 'Tur Dal', displayName: 'Tur (अरहर/तुअर)', icon: '🫘' },
  toor: { canonical: 'Tur Dal', displayName: 'Tur (अरहर/तुअर)', icon: '🫘' },
  arhar: { canonical: 'Tur Dal', displayName: 'Arhar (अरहर)', icon: '🫘' },
  अरहर: { canonical: 'Tur Dal', displayName: 'Arhar (अरहर)', icon: '🫘' },
  तुअर: { canonical: 'Tur Dal', displayName: 'Tur (तुअर)', icon: '🫘' },
  moong: { canonical: 'Moong', displayName: 'Moong (मूंग)', icon: '🫘' },
  मूंग: { canonical: 'Moong', displayName: 'Moong (मूंग)', icon: '🫘' },

  // Millet
  bajra: { canonical: 'Bajra', displayName: 'Bajra (बाजरा)', icon: '🌾' },
  बाजरा: { canonical: 'Bajra', displayName: 'Bajra (बाजरा)', icon: '🌾' },
  jowar: { canonical: 'Jowar', displayName: 'Jowar (ज्वार)', icon: '🌾' },
  ज्वार: { canonical: 'Jowar', displayName: 'Jowar (ज्वार)', icon: '🌾' },
  barley: { canonical: 'Barley', displayName: 'Barley (जौ)', icon: '🌾' },
  jau: { canonical: 'Barley', displayName: 'Barley (जौ)', icon: '🌾' },
  जौ: { canonical: 'Barley', displayName: 'Barley (जौ)', icon: '🌾' },

  // Fruits
  mango: { canonical: 'Mango', displayName: 'Mango (आम)', icon: '🥭' },
  mangoes: { canonical: 'Mango', displayName: 'Mango (आम)', icon: '🥭' },
  aam: { canonical: 'Mango', displayName: 'Mango (आम)', icon: '🥭' },
  आम: { canonical: 'Mango', displayName: 'Mango (आम)', icon: '🥭' },
  banana: { canonical: 'Banana', displayName: 'Banana (केला)', icon: '🍌' },
  kela: { canonical: 'Banana', displayName: 'Banana (केला)', icon: '🍌' },
  केला: { canonical: 'Banana', displayName: 'Banana (केला)', icon: '🍌' },
  apple: { canonical: 'Apple', displayName: 'Apple (सेब)', icon: '🍎' },
  apples: { canonical: 'Apple', displayName: 'Apple (सेब)', icon: '🍎' },
  seb: { canonical: 'Apple', displayName: 'Apple (सेब)', icon: '🍎' },
  सेब: { canonical: 'Apple', displayName: 'Apple (सेब)', icon: '🍎' },
}

const UNIT_DICTIONARY: Record<string, string> = {
  quintal: 'quintal',
  quintals: 'quintal',
  quntal: 'quintal',
  क्विंटल: 'quintal',
  कंटल: 'quintal',
  kg: 'kg',
  kgs: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  किग्रा: 'kg',
  किलो: 'kg',
  किलोग्राम: 'kg',
  tonne: 'tonne',
  tonnes: 'tonne',
  ton: 'tonne',
  tons: 'tonne',
  टन: 'tonne',
  bag: 'bag',
  bags: 'bag',
  bori: 'bag',
  boriyan: 'bag',
  boriyaan: 'bag',
  बोरी: 'bag',
  बोरियां: 'bag',
  थैला: 'bag',
  crate: 'crate',
  crates: 'crate',
  क्रेट: 'crate',
  dozen: 'dozen',
  dozens: 'dozen',
  darjan: 'dozen',
  दर्जन: 'dozen',
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  twentyfive: 25,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
  lakh: 100000,

  ek: 1,
  do: 2,
  teen: 3,
  chaar: 4,
  char: 4,
  paanch: 5,
  panch: 5,
  chhe: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
  gyarah: 11,
  barah: 12,
  pandrah: 15,
  bees: 20,
  pachis: 25,
  pachees: 25,
  tees: 30,
  chalis: 40,
  chaalis: 40,
  pachas: 50,
  pachaas: 50,
  saath: 60,
  sattar: 70,
  assi: 80,
  nabbe: 90,
  sau: 100,
  hazar: 1000,
  hazaar: 1000,

  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  छह: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
  दस: 10,
  ग्यारह: 11,
  बारह: 12,
  पंद्रह: 15,
  बीस: 20,
  पच्चीस: 25,
  तीस: 30,
  चालीस: 40,
  पचास: 50,
  साठ: 60,
  सत्तर: 70,
  अस्सी: 80,
  नब्बे: 90,
  सौ: 100,
  हज़ार: 1000,
  लाख: 100000,
}

const KNOWN_LOCATIONS = [
  'Nagpur',
  'Indore',
  'Bhopal',
  'Nashik',
  'Pune',
  'Mumbai',
  'Delhi',
  'Jaipur',
  'Lucknow',
  'Patna',
  'Ahmedabad',
  'Rajkot',
  'Surat',
  'Amravati',
  'Akola',
  'Jabalpur',
  'Ujjain',
  'Gwalior',
  'Latur',
  'Solapur',
  'Kolhapur',
  'Kanpur',
  'Varanasi',
  'Agra',
  'Ludhiana',
  'Amritsar',
  'Karnal',
  'Hisar',
  'Kota',
  'Jodhpur',
  'Hyderabad',
  'Bengaluru',
  'Chennai',
  'Madhya Pradesh',
  'Maharashtra',
  'Rajasthan',
  'Uttar Pradesh',
  'Punjab',
  'Haryana',
  'Gujarat',
  'Bihar',
  'नागपुर',
  'इंदौर',
  'भोपाल',
  'नासिक',
  'पुणे',
  'मुंबई',
  'दिल्ली',
  'जयपुर',
  'लखनऊ',
  'महाराष्ट्र',
  'मध्य प्रदेश',
  'राजस्थान',
  'उत्तर प्रदेश',
  'पंजाब',
  'हरियाणा',
  'गुजरात',
]

// --------------------------------------------------------------------------
// Extraction Helpers
// --------------------------------------------------------------------------

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[,\.?!;:'"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Extracts crop from normalized input string */
function extractCrop(normalized: string): { crop?: string; displayName?: string; icon?: string } {
  const words = normalized.split(' ')

  // Try 2-word combinations first (e.g. tur dal, sweet corn)
  for (let i = 0; i < words.length - 1; i++) {
    const pair = `${words[i]} ${words[i + 1]}`
    if (CROP_DICTIONARY[pair]) {
      return {
        crop: CROP_DICTIONARY[pair].canonical,
        displayName: CROP_DICTIONARY[pair].displayName,
        icon: CROP_DICTIONARY[pair].icon,
      }
    }
  }

  // Single word search
  for (const word of words) {
    if (CROP_DICTIONARY[word]) {
      return {
        crop: CROP_DICTIONARY[word].canonical,
        displayName: CROP_DICTIONARY[word].displayName,
        icon: CROP_DICTIONARY[word].icon,
      }
    }
  }

  // Direct substring check for Devanagari or compound words
  for (const [key, val] of Object.entries(CROP_DICTIONARY)) {
    if (normalized.includes(key)) {
      return { crop: val.canonical, displayName: val.displayName, icon: val.icon }
    }
  }

  return {}
}

/** Extracts quantity and unit */
function extractQuantityAndUnit(normalized: string): { quantity?: number; unit?: string } {
  // Pattern 1: Digits + unit (e.g. "50 quintal", "20.5 kg", "100bori")
  const digitUnitMatch = normalized.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z\u0900-\u097F]+)/)
  if (digitUnitMatch) {
    const qty = parseFloat(digitUnitMatch[1])
    const unitWord = digitUnitMatch[2].toLowerCase()
    if (UNIT_DICTIONARY[unitWord]) {
      return { quantity: qty, unit: UNIT_DICTIONARY[unitWord] }
    }
    return { quantity: qty, unit: 'kg' }
  }

  // Pattern 2: Word quantity + unit (e.g. "pachas quintal", "पचास क्विंटल")
  const words = normalized.split(' ')
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i]
    const word2 = words[i + 1]
    if (NUMBER_WORDS[word1] !== undefined && UNIT_DICTIONARY[word2]) {
      return { quantity: NUMBER_WORDS[word1], unit: UNIT_DICTIONARY[word2] }
    }
  }

  // Pattern 3: Standalone number
  const standAloneNum = normalized.match(/\b(\d+(?:\.\d+)?)\b/)
  if (standAloneNum) {
    const num = parseFloat(standAloneNum[1])
    // Look for unit anywhere in string
    for (const [uKey, uVal] of Object.entries(UNIT_DICTIONARY)) {
      if (normalized.includes(uKey)) {
        return { quantity: num, unit: uVal }
      }
    }
    return { quantity: num, unit: 'kg' }
  }

  // Pattern 4: Standalone word number
  for (const word of words) {
    if (NUMBER_WORDS[word] !== undefined) {
      for (const [uKey, uVal] of Object.entries(UNIT_DICTIONARY)) {
        if (normalized.includes(uKey)) {
          return { quantity: NUMBER_WORDS[word], unit: uVal }
        }
      }
      return { quantity: NUMBER_WORDS[word], unit: 'kg' }
    }
  }

  return {}
}

/** Extracts price if mentioned */
function extractPrice(normalized: string): number | undefined {
  // Pattern: "₹2500", "rs 2500", "2500 rupaye", "2500 rs", "at 2500", "rate 2500"
  const priceMatch = normalized.match(
    /(?:rs\.?|₹|inr|rate|price|rupaye|rupee|रुपये|कीमत)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs|₹|rupaye|rupees|रुपये)/,
  )
  if (priceMatch) {
    const val = parseFloat(priceMatch[1] || priceMatch[2])
    if (!isNaN(val) && val > 0) return val
  }
  return undefined
}

/** Extracts location */
function extractLocation(normalized: string): string | undefined {
  for (const loc of KNOWN_LOCATIONS) {
    if (normalized.toLowerCase().includes(loc.toLowerCase())) {
      return loc
    }
  }
  return undefined
}

// --------------------------------------------------------------------------
// Core Intent Classification & Router
// --------------------------------------------------------------------------

/**
 * Parses natural language and returns a structured, safe action object.
 */
export function routeMagicQuery(query: string): MagicAction {
  const trimmed = query.trim()
  if (!trimmed) {
    return {
      intent: 'ask_ai',
      destination: SAFE_ROUTE_MAP.ask_ai,
      label: 'Bhasha AI Assistant',
      icon: '🌱',
      confidence: 1.0,
      explanation: 'Opening Assistant',
      summaryPills: [],
      fields: { message: '' },
      originalQuery: query,
    }
  }

  const norm = normalizeText(trimmed)

  // 1. WEATHER INTENT
  if (
    norm.includes('weather') ||
    norm.includes('mausam') ||
    norm.includes('barsat') ||
    norm.includes('baarish') ||
    norm.includes('barish') ||
    norm.includes('forecast') ||
    norm.includes('temperature') ||
    norm.includes('rain') ||
    norm.includes('मौसम') ||
    norm.includes('बारिश') ||
    norm.includes('तापमान') ||
    norm.includes('बरसात') ||
    norm.includes('हवामान')
  ) {
    return {
      intent: 'weather',
      destination: SAFE_ROUTE_MAP.weather,
      label: 'Weather & Agrometeorology',
      icon: '🌤️',
      confidence: 0.95,
      explanation: 'Routing to live weather and agro-forecast in Bhasha Assistant',
      summaryPills: [
        { label: 'Topic', value: 'Weather Forecast', icon: '🌤️' },
        { label: 'Destination', value: 'AI Assistant', icon: '💬' },
      ],
      fields: {
        message: trimmed,
      },
      originalQuery: trimmed,
    }
  }

  // 2. CROP DOCTOR / DISEASE INTENT
  const isCropDoctor =
    norm.includes('crop doctor') ||
    norm.includes('disease') ||
    norm.includes('leaf') ||
    norm.includes('fungus') ||
    norm.includes('infection') ||
    norm.includes('pest') ||
    norm.includes('keeda') ||
    norm.includes('kide') ||
    norm.includes('bimari') ||
    norm.includes('patte') ||
    norm.includes('pila') ||
    norm.includes('peela') ||
    norm.includes('kharaab') ||
    norm.includes('kharab') ||
    norm.includes('beemari') ||
    norm.includes('sick') ||
    norm.includes('रोग') ||
    norm.includes('बीमारी') ||
    norm.includes('पत्ते') ||
    norm.includes('कीड़ा') ||
    norm.includes('फफूंद') ||
    norm.includes('फसल खराब') ||
    norm.includes('इलाज') ||
    ((norm.includes('fasal') ||
      norm.includes('crop') ||
      norm.includes('plant') ||
      norm.includes('पौधा') ||
      norm.includes('फसल')) &&
      (norm.includes('problem') ||
        norm.includes('issue') ||
        norm.includes('dikkat') ||
        norm.includes('kharab') ||
        norm.includes('nuksan') ||
        norm.includes('दिक्कत') ||
        norm.includes('नुकसान')))

  if (isCropDoctor) {
    const { crop, displayName } = extractCrop(norm)
    const pills = [{ label: 'Feature', value: 'Crop Doctor (रोग निदान)', icon: '🩺' }]
    if (crop) {
      pills.push({ label: 'Crop', value: displayName || crop, icon: '🌿' })
    }

    return {
      intent: 'crop_doctor',
      destination: SAFE_ROUTE_MAP.crop_doctor,
      label: 'Crop Doctor Diagnosis',
      icon: '🩺',
      confidence: 0.92,
      explanation: crop
        ? `Opening Crop Doctor for ${displayName || crop} diagnosis and advisory`
        : 'Opening Crop Doctor for plant disease diagnosis',
      summaryPills: pills,
      fields: {
        cropType: crop,
        concern: trimmed,
      },
      originalQuery: trimmed,
    }
  }

  // 3. GOVERNMENT SCHEMES INTENT
  if (
    norm.includes('scheme') ||
    norm.includes('schemes') ||
    norm.includes('yojana') ||
    norm.includes('yojna') ||
    norm.includes('subsidy') ||
    norm.includes('pm kisan') ||
    norm.includes('pmkisan') ||
    norm.includes('sarkari') ||
    norm.includes('kisan credit') ||
    norm.includes('fasal bima') ||
    norm.includes('योजना') ||
    norm.includes('योजनाएं') ||
    norm.includes('सब्सिडी') ||
    norm.includes('पीएम किसान') ||
    norm.includes('अनुदान') ||
    norm.includes('सरकारी')
  ) {
    return {
      intent: 'schemes',
      destination: SAFE_ROUTE_MAP.schemes,
      label: 'Government Schemes & Subsidies',
      icon: '📜',
      confidence: 0.94,
      explanation: 'Opening Government Agri Schemes and Eligibility checker',
      summaryPills: [
        { label: 'Category', value: 'Government Schemes', icon: '🏛️' },
        { label: 'Action', value: 'Check Eligibility', icon: '✅' },
      ],
      fields: {},
      originalQuery: trimmed,
    }
  }

  // 4. ORDERS & TRACKING INTENT
  if (
    norm.includes('order') ||
    norm.includes('orders') ||
    norm.includes('booking') ||
    norm.includes('kharidi') ||
    norm.includes('bikri') ||
    norm.includes('purchases') ||
    norm.includes('sales') ||
    norm.includes('ऑर्डर') ||
    norm.includes('आर्डर') ||
    norm.includes('खरीद')
  ) {
    const isSeller =
      norm.includes('sale') ||
      norm.includes('sales') ||
      norm.includes('beche') ||
      norm.includes('biki') ||
      norm.includes('विक्रेता')
    const tab: 'buyer' | 'seller' = isSeller ? 'seller' : 'buyer'

    return {
      intent: 'orders',
      destination: SAFE_ROUTE_MAP.orders,
      label: isSeller ? 'My Sales Orders' : 'My Purchase Orders',
      icon: '📦',
      confidence: 0.91,
      explanation: `Navigating to ${isSeller ? 'Sales' : 'Orders'} tab`,
      summaryPills: [
        { label: 'View', value: isSeller ? 'Seller Orders' : 'Buyer Orders', icon: '📦' },
      ],
      fields: { tab },
      originalQuery: trimmed,
    }
  }

  // 5. BARTER & SWAP INTENT
  if (
    norm.includes('barter') ||
    norm.includes('swap') ||
    norm.includes('exchange') ||
    norm.includes('badle') ||
    norm.includes('badalna') ||
    norm.includes('badli') ||
    norm.includes('adla badli') ||
    norm.includes('dekar') ||
    norm.includes('de kar') ||
    norm.includes('de ke') ||
    norm.includes('देकर') ||
    norm.includes('देके') ||
    norm.includes('बदले') ||
    norm.includes('अदला-बदली') ||
    norm.includes('एक्सचेंज') ||
    norm.includes('tractor') ||
    norm.includes('ट्रैक्टर')
  ) {
    const pills: Array<{ label: string; value: string; icon?: string }> = [
      { label: 'Action', value: 'Crop Barter / Swap', icon: '🔄' },
    ]

    // Identify offered vs wanted
    let itemWanted: 'fertilizer' | 'seeds' | 'pesticide' | undefined
    let itemOffered: 'wheat' | 'rice' | undefined

    if (
      norm.includes('fertilizer') ||
      norm.includes('khaad') ||
      norm.includes('khad') ||
      norm.includes('खाद') ||
      norm.includes('उर्वरक')
    ) {
      itemWanted = 'fertilizer'
      pills.push({ label: 'Wanted', value: 'Fertilizer (खाद)', icon: '🧪' })
    } else if (norm.includes('seed') || norm.includes('beej') || norm.includes('बीज')) {
      itemWanted = 'seeds'
      pills.push({ label: 'Wanted', value: 'Seeds (बीज)', icon: '🌱' })
    } else if (
      norm.includes('pesticide') ||
      norm.includes('dawa') ||
      norm.includes('keetnashak') ||
      norm.includes('कीटनाशक')
    ) {
      itemWanted = 'pesticide'
      pills.push({ label: 'Wanted', value: 'Pesticide (कीटनाशक)', icon: '🛡️' })
    }

    if (
      norm.includes('wheat') ||
      norm.includes('gehun') ||
      norm.includes('gehu') ||
      norm.includes('गेहूं')
    ) {
      itemOffered = 'wheat'
      pills.push({ label: 'Offered', value: 'Wheat (गेहूं)', icon: '🌾' })
    } else if (
      norm.includes('rice') ||
      norm.includes('paddy') ||
      norm.includes('chawal') ||
      norm.includes('dhan') ||
      norm.includes('चावल') ||
      norm.includes('धान')
    ) {
      itemOffered = 'rice'
      pills.push({ label: 'Offered', value: 'Rice / Paddy (धान)', icon: '🍚' })
    }

    return {
      intent: 'barter',
      destination: SAFE_ROUTE_MAP.barter,
      label: 'Barter Crop for Inputs',
      icon: '🔄',
      confidence: 0.93,
      explanation: 'Navigating to Barter marketplace to swap crop with verified dealers',
      summaryPills: pills,
      fields: {
        rawQuery: trimmed,
        itemWanted,
        itemOffered,
      },
      originalQuery: trimmed,
    }
  }

  // 6. SELL PRODUCE INTENT (Farmer listing harvest)
  const isSellProduce =
    norm.includes('sell') ||
    norm.includes('selling') ||
    norm.includes('list') ||
    norm.includes('listing') ||
    norm.includes('bechna') ||
    norm.includes('bechni') ||
    norm.includes('becho') ||
    norm.includes('bikri') ||
    norm.includes('बेचना') ||
    norm.includes('बेचनी') ||
    norm.includes('बेचूंगा') ||
    norm.includes('लिस्ट')

  if (isSellProduce) {
    const { crop, displayName, icon } = extractCrop(norm)
    const { quantity, unit } = extractQuantityAndUnit(norm)
    const price = extractPrice(norm)
    const location = extractLocation(norm)

    const pills: Array<{ label: string; value: string; icon?: string }> = [
      { label: 'Action', value: 'Sell Produce', icon: '🌾' },
    ]

    if (crop) {
      pills.push({ label: 'Crop', value: displayName || crop, icon: icon || '🌾' })
    }
    if (quantity) {
      pills.push({ label: 'Quantity', value: `${quantity} ${unit || 'kg'}`, icon: '📦' })
    }
    if (price) {
      pills.push({ label: 'Price', value: `₹${price}`, icon: '💰' })
    }
    if (location) {
      pills.push({ label: 'Location', value: location, icon: '📍' })
    }

    return {
      intent: 'sell_produce',
      destination: SAFE_ROUTE_MAP.sell_produce,
      label: crop ? `Sell ${crop}` : 'List Produce for Sale',
      icon: '🌾',
      confidence: crop || quantity ? 0.96 : 0.88,
      explanation: 'Opening Produce page with listing prefill',
      summaryPills: pills,
      fields: {
        action: 'create',
        cropType: crop,
        quantity,
        unit: unit || 'kg',
        pricePerUnit: price,
        district: location,
      },
      originalQuery: trimmed,
    }
  }

  // 7. BUY PRODUCE INTENT
  const isBuyProduce =
    norm.includes('buy') ||
    norm.includes('purchase') ||
    norm.includes('kharidna') ||
    norm.includes('kharidni') ||
    norm.includes('kharido') ||
    norm.includes('chahiye') ||
    norm.includes('खरीदना') ||
    norm.includes('खरीदनी') ||
    norm.includes('चाहिए')

  if (isBuyProduce) {
    const { crop, displayName, icon } = extractCrop(norm)
    const location = extractLocation(norm)

    const pills: Array<{ label: string; value: string; icon?: string }> = [
      { label: 'Action', value: 'Browse Produce', icon: '🛒' },
    ]

    if (crop) {
      pills.push({ label: 'Crop', value: displayName || crop, icon: icon || '🌾' })
    }
    if (location) {
      pills.push({ label: 'Location', value: location, icon: '📍' })
    }

    return {
      intent: 'buy_produce',
      destination: SAFE_ROUTE_MAP.buy_produce,
      label: crop ? `Browse ${crop}` : 'Browse Produce Market',
      icon: '🛒',
      confidence: 0.9,
      explanation: 'Opening Produce marketplace with search filters',
      summaryPills: pills,
      fields: {
        action: 'browse',
        cropFilter: crop,
        stateFilter: location,
      },
      originalQuery: trimmed,
    }
  }

  // 8. MANDI / MARKET PRICES INTENT
  const isMarket =
    norm.includes('mandi') ||
    norm.includes('bhav') ||
    norm.includes('bhaav') ||
    norm.includes('market') ||
    norm.includes('rate') ||
    norm.includes('rates') ||
    norm.includes('price') ||
    norm.includes('prices') ||
    norm.includes('dam') ||
    norm.includes('daam') ||
    norm.includes('मंडी') ||
    norm.includes('भाव') ||
    norm.includes('दाम') ||
    norm.includes('दर')

  if (isMarket) {
    const { crop, displayName, icon } = extractCrop(norm)
    const location = extractLocation(norm)

    const pills: Array<{ label: string; value: string; icon?: string }> = [
      { label: 'Service', value: 'Mandi Rates', icon: '📊' },
    ]

    if (crop) {
      pills.push({ label: 'Commodity', value: displayName || crop, icon: icon || '🌾' })
    }
    if (location) {
      pills.push({ label: 'Mandi/District', value: location, icon: '📍' })
    }

    return {
      intent: 'market_prices',
      destination: SAFE_ROUTE_MAP.market_prices,
      label: crop ? `${crop} Mandi Rates` : 'Mandi Market Prices',
      icon: '📊',
      confidence: 0.92,
      explanation: 'Checking live APMC mandi rates and price trends',
      summaryPills: pills,
      fields: {
        commodity: crop,
        district: location,
      },
      originalQuery: trimmed,
    }
  }

  // 9. NOTIFICATIONS INTENT
  if (
    norm.includes('notification') ||
    norm.includes('notifications') ||
    norm.includes('alert') ||
    norm.includes('alerts') ||
    norm.includes('suchna') ||
    norm.includes('suchnaye') ||
    norm.includes('सूचना') ||
    norm.includes('अलर्ट')
  ) {
    return {
      intent: 'notifications',
      destination: SAFE_ROUTE_MAP.notifications,
      label: 'Alerts & Notifications',
      icon: '🔔',
      confidence: 0.95,
      explanation: 'Opening your notifications and mandi alerts',
      summaryPills: [{ label: 'View', value: 'Unread Alerts', icon: '🔔' }],
      fields: {},
      originalQuery: trimmed,
    }
  }

  // 10. DASHBOARD / HOME INTENT
  if (
    norm.includes('dashboard') ||
    norm.includes('go to home') ||
    norm.includes('go home') ||
    norm.includes('main page') ||
    norm.includes('home page') ||
    norm.includes('डैशबोर्ड') ||
    norm === 'home' ||
    norm === 'dashboard' ||
    norm === 'ghar' ||
    norm === 'होम' ||
    norm === 'मुख्य पृष्ठ'
  ) {
    return {
      intent: 'dashboard',
      destination: SAFE_ROUTE_MAP.dashboard,
      label: 'Dashboard Home',
      icon: '🏠',
      confidence: 0.98,
      explanation: 'Navigating to Dashboard',
      summaryPills: [{ label: 'View', value: 'Dashboard', icon: '🏠' }],
      fields: {},
      originalQuery: trimmed,
    }
  }

  // 11. PROFILE INTENT
  if (
    norm.includes('profile') ||
    norm.includes('account') ||
    norm.includes('settings') ||
    norm.includes('khata') ||
    norm.includes('प्रोफाइल') ||
    norm.includes('खाता')
  ) {
    return {
      intent: 'profile',
      destination: SAFE_ROUTE_MAP.profile,
      label: 'Farmer Profile',
      icon: '👤',
      confidence: 0.92,
      explanation: 'Opening Profile and account settings',
      summaryPills: [{ label: 'View', value: 'User Profile', icon: '👤' }],
      fields: {},
      originalQuery: trimmed,
    }
  }

  // 12. FALLBACK -> ASK AI ASSISTANT
  // For general queries, farming advice, ambiguous input, or conversational prompts
  return {
    intent: 'ask_ai',
    destination: SAFE_ROUTE_MAP.ask_ai,
    label: 'Ask Bhasha AI',
    icon: '🌱',
    confidence: 0.85,
    explanation: 'Routing to Bhasha AI farming assistant with your query',
    summaryPills: [
      { label: 'Topic', value: 'Farming Advisory', icon: '🌱' },
      { label: 'Query', value: trimmed.length > 30 ? `${trimmed.slice(0, 30)}…` : trimmed },
    ],
    fields: {
      message: trimmed,
    },
    originalQuery: trimmed,
  }
}
