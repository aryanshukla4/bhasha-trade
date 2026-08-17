# Bhasha Trade Backend

FastAPI and PostgreSQL/SQLite backend for **Bhasha Trade** — a vernacular-first agriculture marketplace and advisory platform.

---

## Technical Overview

- **Framework**: FastAPI (Python 3.10+)
- **Database**: PostgreSQL (Production) / SQLite (Development & Testing)
- **Rate Limiting**: SlowAPI + Redis
- **Security**: Base64 URL-safe HMAC signed tokens & HTTP security headers

---

## Quickstart Guide

### 1. Prerequisites

Ensure you have **Python 3.10+** installed:
```powershell
python --version
```

### 2. Environment Setup

Copy the template `.env` file from `.env.example`:
```powershell
Copy-Item .env.example .env
```

Default local `.env` settings:
```env
APP_ENV=development
DATABASE_URL=sqlite:///./data/bhasha-trade.sqlite
JWT_SECRET=development-only-secret-change-me
REDIS_URL=memory://
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Virtual Environment & Dependency Installation

Create a virtual environment and install backend dependencies:

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Upgrade pip and install all required packages
python -m pip install --upgrade pip
pip install -r requirements.txt
```

*(If using Linux/macOS, activate with `source .venv/bin/activate`)*

---

## Running the Backend Server

Start the live FastAPI server with hot reloading enabled:

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

Once running:
- **Server Health Check**: Navigate to `http://localhost:8000/health`
- **Interactive OpenAPI (Swagger UI)**: Open `http://localhost:8000/docs`
- **ReDoc Interactive Documentation**: Open `http://localhost:8000/redoc`

---

## Running Automated Tests

Run the full 23-test API verification suite using `pytest`:

```powershell
# From the backend directory with active virtual environment:
pytest tests -v
```

All 46 API endpoints across Authentication, Mandi Prices, Produce Marketplace, Barter Matching, AI Chat Advisory, Crop Health, Weather, Schemes, Reviews, and Notifications will be tested automatically.

---

## Authentication Flow Example

### 1. Request Phone OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "phone": "+919876543210"
}
```
*In development mode (`APP_ENV=development`), the response includes `"devOtp": "123456"`.*

### 2. Verify OTP & Obtain Bearer Token
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "+919876543210",
  "otp": "123456",
  "name": "Raju Farmer",
  "role": "farmer",
  "preferredLanguage": "hi"
}
```
*Returns `accessToken` and `refreshToken`.*

### 3. Access Protected Routes
Pass the token in the `Authorization` header:
```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

---

## API Endpoint Categories

- **Authentication**: `/api/auth/send-otp`, `/api/auth/verify-otp`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/profile`
- **Language**: `/api/languages`, `/api/user/language`
- **Mandi Prices**: `/api/market/prices`, `/api/market/trends/{commodity}`, `/api/market/nearby-mandis`
- **Produce Marketplace**: `/api/produce` (GET/POST), `/api/produce/{id}` (GET/PUT/DELETE), `/api/produce/{id}/interest`
- **Orders Lifecycle**: `/api/orders`, `/api/orders/{id}`, `/api/orders/{id}/accept`, `/api/orders/{id}/complete`, `/api/orders/{id}/reject`, `/api/orders/{id}/cancel`
- **Barter Matching**: `/api/barter/parse-request`, `/api/barter/request`, `/api/barter/history`, `/api/barter/dealers`, `/api/barter/matches/{id}`, `/api/barter/{id}/connect`, `/api/barter/{id}/confirm`
- **AI Chat & Voice**: `/api/chat/ask`, `/api/chat/history`, `/api/chat/voice-to-text`, `/api/chat/text-to-voice`
- **Crop Health & Advisory**: `/api/crop/detect-disease`, `/api/crop/advisory/{crop_type}`
- **Weather & Schemes**: `/api/weather`, `/api/schemes`, `/api/schemes/{id}`, `/api/schemes/{id}/check-eligibility`
- **Reviews & Notifications**: `/api/reviews`, `/api/users/{id}/verification-status`, `/api/notifications`, `/api/notifications/subscribe`

# Farmer Chatbot — Backend Starter

A minimal FastAPI backend for a farming-focused chatbot: scoped system prompt,
simple market-data retrieval from SQLite, and a Groq-powered LLM call.

## 1. Open this inside WSL Ubuntu

Unzip this folder somewhere **inside your Linux filesystem**, not `/mnt/c/...`
— e.g.:

```bash
mkdir -p ~/projects
mv ~/Downloads/farmer-chatbot.zip ~/projects/   # or wherever you unzipped it
cd ~/projects/farmer-chatbot
code .
```

`code .` opens it in VS Code connected to WSL (install the "WSL" extension
in VS Code first if you haven't).

## 2. Set up Python

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 3. Get a free Groq API key

1. Go to https://console.groq.com and sign up (free)
2. Create an API key
3. Copy `.env.example` to `.env` and paste your key in:

```bash
cp .env.example .env
```

Check the Groq console for the current list of available free models —
model names change over time, so confirm `GROQ_MODEL` in `.env` matches
one that's currently listed there.

## 4. Run the server

```bash
uvicorn app.main:app --reload
```

It starts at `http://localhost:8000`. First run auto-creates
`data/mandi_prices.db` with a few sample crop prices (tomato, onion, wheat,
cotton, soybean, rice) so you have something to test retrieval with.

## 5. Test it

Open `static/test.html` directly in your browser (just double-click it, or
`python3 -m http.server 8080` from inside `static/` and visit
`http://localhost:8080/test.html`). Try:

- "What's the tomato price in Nashik?" → should use real DB data
- "How do I control aphids on my cotton crop?" → general farming answer
- "What's the capital of France?" → should politely decline / redirect

## 6. Next steps

- Swap the sample SQLite data for a real, regularly updated price source
- Add the topic-guard safety net (a second lightweight check before the
  main call) if you find the model straying off-topic
- Once stable, containerize with Docker and deploy (Railway, Render, or a
  small VPS all work well for a FastAPI app like this)
- Replace the CORS `allow_origins=["*"]` with your real website domain
  before going live
- Swap `test.html`'s widget code into your actual website's frontend,
  pointing `API_URL` at your deployed backend




main.py — the entry point
This is where FastAPI lives. When your browser sends a message, it hits the /chat route defined here. It doesn't do any "thinking" itself — its job is coordination: grab the message, ask retrieval.py if there's relevant market data, hand everything to prompts.py to assemble the final prompt, send that to Groq's API over HTTPS, and return the reply as JSON. It also has a /health route (just a sanity check) and CORS settings (currently *, meaning any website can call it — you'll lock this to your real domain later).

retrieval.py — the market-data lookup
Before your message reaches the AI, this file scans it for known crop names (using regex word-boundaries so "price" doesn't accidentally match "rice" — that bug we caught earlier). If it finds a crop, it fetches the latest rows for that crop from the database and returns them as plain text. If nothing matches, it returns nothing, and the chatbot answers using its general knowledge instead.

database.py — the data layer
This owns the actual SQLite file (data/mandi_prices.db). It defines the table structure (crop, market, price_per_quintal, date), creates it if missing, and seeds it with sample rows the first time it runs. retrieval.py is the only file that queries this — nothing else touches the database directly, which keeps things organized as the project grows.

prompts.py — the personality and instructions
This holds SYSTEM_PROMPT, the text that tells the model who it is, what topics to stick to, and how to handle off-topic questions. build_messages() combines that system prompt with any market data from retrieval.py and the farmer's actual question, into the exact format Groq's API expects.

test.html — your test frontend
A minimal standalone page so you can try the bot in a browser without touching your real website. It sends whatever you type to /chat and displays the reply.