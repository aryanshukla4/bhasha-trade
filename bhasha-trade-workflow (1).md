# Bhasha Trade — Full Hackathon Workflow

A vernacular-first agri-marketplace + advisory platform. Core idea: farmers interact in **their own language (text or voice)**, get real mandi prices, sell produce directly, get crop advisory — and every design choice is made to build **trust**, since that's the #1 adoption blocker you already identified.

---

## 1. Problem → Design Principle Mapping

| Farmer Pain Point | Design Response |
|---|---|
| Doesn't trust apps (past scams, middlemen) | Show live mandi price next to your offered price (transparency), verified buyer badges, no hidden fees shown upfront |
| Low literacy / comfort with English UI | Full language switcher + **voice input/output**, icons over text, regional script (Devanagari, Tamil, etc.) |
| Poor/no internet in rural areas | PWA with offline caching, SMS/IVR fallback for critical alerts (price, weather) |
| Doesn't know digital selling exists | Simple "List your crop" flow — photo + voice description, AI fills the rest |
| Cash-scarce, used to informal barter with local dealers | Let farmer just *say* what they want in plain language ("fertilizer for wheat") — AI parses it, no rigid form-filling |
| Skeptical of AI advice | Show source ("Based on ICAR guidelines" / "Govt of India data"), not just "AI says" |

---

## 2. Core User Workflow

```
Farmer opens site → Select language (voice or tap) → OTP login (phone only, no email)
        ↓
   Home Dashboard (in selected language)
        ↓
   ┌─────────────┬─────────────┬─────────────┬──────────────┬────────────────┐
   Sell Produce   Check Mandi    Crop Health    Ask AI Advisor   Barter/Exchange
   (list crop)    Prices         (upload photo)  (voice/text Q&A) (swap goods)
        ↓              ↓              ↓               ↓                ↓
   Buyer sees     Compare to     Get disease     Get answer in    Farmer says (voice
   listing,       nearby         + treatment      farmer's         or text): "connect
   contacts       mandis         suggestion       language          me to dealer selling
   farmer                                         (text + audio)    4kg fertilizer for
        ↓                                                           wheat" → AI parses
   Deal made → Order tracked → Review/Rating (builds trust for      intent → matches
                                for next farmer)                    against dealer listings
                                                                     → shows matches →
                                                                     farmer confirms swap
```

### Barter/Exchange sub-flow (natural language → matched deal)

```
Farmer types/speaks:
"मुझे गेहूं के बदले 4 किलो खाद चाहिए" (I want 4kg fertilizer in exchange for wheat)
        ↓
Speech-to-text (if voice) → translate to English internally for processing
        ↓
LLM intent/entity extraction:
   intent: barter_request
   item_wanted: fertilizer, qty: 4kg
   item_offered: wheat, qty: (ask if not specified)
        ↓
Search dealer_listings + produce_listings for matches
   (dealer selling fertilizer AND open to wheat-in-exchange OR standard barter rate)
        ↓
Show 2-3 matched dealers (in farmer's language): name, quantity, verified badge,
distance, equivalent value comparison ("Market rate check: is this a fair trade?")
        ↓
Farmer taps "Connect" → chat/call opens with dealer → deal logged as a
barter_order (not cash order) → both sides confirm completion → review
```

---

## 3. Tech Stack

**Frontend**
- React (Vite) or Next.js — Next.js preferred if you want SSR for low-end devices + SEO for buyers
- Tailwind CSS
- PWA (installable, offline-capable — critical for rural connectivity)
- `react-i18next` or `next-intl` for UI string translation
- Web Speech API (browser) for quick voice input demo, backed by a proper ASR API for accuracy

**Backend**
- Node.js + Express (fastest to hackathon-ship) or Django REST Framework if your team knows Python (helps since most agri ML models are Python-native)
- PostgreSQL (structured: users, listings, orders, prices) + Redis for caching mandi price lookups

**Auth**
- Phone OTP only (Firebase Auth Phone or MSG91/Twilio Verify) — no email/password, matches farmer digital literacy

**Storage**
- Cloudinary or Firebase Storage for crop photos

**Real-time**
- Socket.io for farmer↔buyer chat/negotiation

**Hosting**
- Vercel (frontend) + Render/Railway (backend) — free tiers, fast hackathon deploy

---

## 4. Language & Voice AI (the "Bhasha" core)

This is your differentiator — prioritize getting this rock-solid.

| Need | Recommended API/Model | Notes |
|---|---|---|
| **Text translation** | **Bhashini API** (Govt of India, digitalindia.gov.in) | Purpose-built for Indian languages, free for public use, huge hackathon credibility since it's a govt initiative |
| Backup/alt translation | Google Cloud Translation API, or **AI4Bharat IndicTrans2** (open-source, self-hostable) | Use if Bhashini has downtime during demo |
| Speech-to-Text (farmer speaks query) | Bhashini ASR, or **AI4Bharat IndicASR**, or OpenAI **Whisper** (great multilingual support, easy API) | Whisper is easiest to integrate fast for a hackathon |
| Text-to-Speech (read answer aloud) | Bhashini TTS, or **AI4Bharat IndicTTS**, or Google Cloud TTS | Needed since many farmers prefer listening over reading |
| Conversational AI advisor | Claude API or GPT-4 API, **prompted with agri context + language instruction** | e.g., system prompt: "Answer only in Hindi, simple vocabulary, farmer-friendly tone, cite ICAR/govt sources where possible" |

**Language toggle implementation**: store `preferred_language` on user profile → every API response (AI advisory, chat) is generated in that language via the LLM prompt; every static UI string is translated via i18n JSON files (pre-translate Hindi/Marathi/etc. for hackathon demo, don't rely on live translation for UI chrome — too slow/costly).

---

## 5. AI/ML Models Needed

| Feature | Model/Approach | Dataset to train/demo on |
|---|---|---|
| Crop disease detection from photo | CNN (ResNet50/EfficientNet, transfer learning) — or fastest: use a **pretrained Plantix-style model** or Hugging Face pretrained plant-disease model | **PlantVillage dataset** (Kaggle, ~54,000 leaf images, 38 classes) — best hackathon-ready dataset |
| Mandi price trend/prediction | Simple time-series (Prophet, or even linear regression for demo) | **Agmarknet** (data.gov.in) — daily commodity prices across Indian mandis, free API/CSV |
| Crop advisory chatbot | LLM (Claude/GPT) + RAG over govt advisory docs | ICAR Krishi Vigyan Kendra publications, PM-KISAN scheme docs (data.gov.in) |
| Weather-based alerts | Weather API + rule-based advisory ("rain expected, delay harvest") | **IMD (India Meteorological Dept)** API, or OpenWeatherMap as easy fallback |
| Fraud/trust scoring for buyers | Simple rule-based score (completed orders, reviews, verification status) — no need for ML here, keep it explainable | Your own order/review data |
| **Barter/exchange request parsing** ("connect me to dealer selling 4kg fertilizer for wheat") | LLM function-calling / structured output (Claude or GPT with JSON mode) to extract `{intent, item_wanted, qty_wanted, item_offered, qty_offered}` from free text or transcribed voice | No public dataset needed — this is a prompt-engineering task, not a trained model. Few-shot examples in the prompt (5-10 sample farmer phrasings in Hindi/English) are enough for a hackathon demo |

**Hackathon tip**: don't train models from scratch under time pressure. Use pretrained plant-disease models from Hugging Face, and treat Agmarknet as a live/static data source rather than building your own predictor unless you have spare time.

---

## 6. Useful Public Datasets/APIs (India-specific)

- **Agmarknet** (agmarknet.gov.in) — daily mandi prices, commodity-wise, state/district-wise
- **data.gov.in** — Agmarknet API, Soil Health Card data, rainfall data, crop production stats
- **eNAM** (enam.gov.in) — National Agriculture Market data
- **PlantVillage dataset** (Kaggle) — leaf disease images
- **IMD** — weather/rainfall data
- **PM-KISAN / govt scheme APIs** (data.gov.in has scheme datasets)
- **Bhashini** (bhashini.gov.in) — translation/ASR/TTS APIs, sandbox access for hackathons

---

## 7. Complete API Route List

### Auth
```
POST   /api/auth/send-otp
POST   /api/auth/verify-otp
GET    /api/auth/me
PUT    /api/auth/profile
```

### Language
```
GET    /api/languages                    → list supported languages
PUT    /api/user/language                → set preferred language
```

### Market Prices
```
GET    /api/market/prices?commodity=&state=&district=
GET    /api/market/trends/:commodityId
GET    /api/market/nearby-mandis?lat=&lon=
```

### Produce Marketplace
```
POST   /api/produce                      → list new produce (photo + voice/text desc)
GET    /api/produce                      → browse listings (buyer side)
GET    /api/produce/:id
PUT    /api/produce/:id
DELETE /api/produce/:id
POST   /api/produce/:id/interest         → buyer expresses interest
```

### Orders/Deals
```
GET    /api/orders
POST   /api/orders/:id/accept
POST   /api/orders/:id/complete
GET    /api/orders/:id
```

### Barter/Exchange
```
POST   /api/barter/parse-request         → send raw text/voice-transcript,
                                            returns structured intent JSON
                                            (item_wanted, qty, item_offered, qty)
POST   /api/barter/request                → create a barter request from parsed intent
GET    /api/barter/matches/:requestId     → find dealers/farmers matching the request
GET    /api/barter/dealers?item=&location= → browse dealers offering an item for barter
POST   /api/barter/:requestId/connect     → farmer connects with a matched dealer
                                            (opens chat, notifies dealer)
POST   /api/barter/:requestId/confirm     → both parties confirm the swap completed
GET    /api/barter/history                → farmer's past barter deals
```

### AI Advisory Chat
```
POST   /api/chat/ask                     → text/voice query, returns answer in user's language
POST   /api/chat/voice-to-text
POST   /api/chat/text-to-voice
GET    /api/chat/history
```

### Crop Health
```
POST   /api/crop/detect-disease          → upload photo, returns diagnosis + treatment
GET    /api/crop/advisory/:cropType
```

### Weather
```
GET    /api/weather?lat=&lon=
```

### Government Schemes
```
GET    /api/schemes
GET    /api/schemes/:id
POST   /api/schemes/:id/check-eligibility
```

### Trust/Reviews
```
GET    /api/reviews/:userId
POST   /api/reviews
GET    /api/users/:id/verification-status
```

### Notifications
```
POST   /api/notifications/subscribe
GET    /api/notifications
```

---

## 8. Minimal DB Schema (core tables)

- **users**: id, phone, name, role (farmer/buyer), preferred_language, location, verified_status
- **produce_listings**: id, farmer_id, crop_type, quantity, price_per_unit, photo_url, description, status
- **orders**: id, listing_id, buyer_id, farmer_id, status, agreed_price
- **market_prices**: commodity, state, district, mandi_name, price, date (synced from Agmarknet)
- **reviews**: id, from_user_id, to_user_id, order_id, rating, comment
- **chat_logs**: id, user_id, query, response, language
- **dealers**: id, name, phone, location, items_available (JSON: item, qty, price, open_to_barter), verified_status
- **barter_requests**: id, farmer_id, item_wanted, qty_wanted, item_offered, qty_offered, status, raw_query_text, parsed_language
- **barter_matches**: id, request_id, dealer_id, match_score, status (pending/connected/confirmed)

---

## 9. Realistic Hackathon Scope (pick this if time is short)

Build these 4 end-to-end, skip the rest as "roadmap" slides:
1. **Language switcher** (UI + AI chat responses in Hindi/English minimum) — this is your hook
2. **Mandi price checker** (pull from Agmarknet, show nearest 3 mandis)
3. **Crop disease detector** (pretrained model, photo upload → diagnosis)
4. **List produce for sale** (simple form + listing feed)

Everything else (orders, reviews, schemes) — mock with static data and present as "Phase 2" in your pitch. Judges respond well to a working narrow slice over a broken wide one.

**Barter/exchange matching is a great "wow" stretch feature** if you have time after the core 4 — it's cheap to build (one LLM call for intent parsing + a simple DB match query) but demos very well, since it directly shows off the "understands farmer's natural language" angle. If time is tight, even a hardcoded demo (2-3 dealer records in the DB, one scripted voice query) is enough to show the concept working end-to-end.

---

## 10. Trust-Building UX Details (don't skip in your pitch)

- Show "Verified by Bhasha Trade" badge only after phone + Aadhaar-optional KYC
- Display price transparently: "Mandi average: ₹X | Your listed price: ₹Y" — no hidden cut
- Use audio testimonials from farmers (even placeholder for demo) instead of text reviews
- State clearly: "No commission" or whatever your actual model is — ambiguity kills trust
- Offer a local-language explainer video/voice note on the homepage: "How this works" in 60 seconds
