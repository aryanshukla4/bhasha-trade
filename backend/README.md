# FastAPI Backend

This is the only supported backend. It uses FastAPI, PostgreSQL, and Redis (rate limiting). Copy `.env.example` to `.env`, create the `bhasha_trade` PostgreSQL database, and set `DATABASE_URL` before starting the API.

For local Postgres + Redis, run `docker compose up -d postgres redis` from the repository root, then set `DATABASE_URL=postgresql+psycopg://bhasha_trade:bhasha_trade_dev@localhost:5432/bhasha_trade` and `REDIS_URL=redis://localhost:6379/0`.

OTP endpoints (`/api/auth/send-otp`, `/api/auth/verify-otp`) are rate limited per IP via Redis. CORS is locked to the origins in `CORS_ORIGINS` (comma-separated).

Start the service from this directory:

```powershell
python -m uvicorn app.main:app --reload --port 8010
```

Run API tests without starting a server:

```powershell
python -m unittest discover -s tests -v
```

Tests use FastAPI's `TestClient` and validate the API in-process.
