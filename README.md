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
