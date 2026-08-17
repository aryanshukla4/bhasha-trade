# Bhasha Trade

Hackathon project: vernacular-first agri-marketplace. `backend/` (FastAPI) is
the **only** supported backend — everything else at the repo root is either
dead/leftover or shared config.

## Run it

```powershell
cd backend
python -m venv .venv               # already exists as backend/.venv on this machine
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env        # then fill in secrets (see below)
python -m uvicorn app.main:app --reload --port 8000
```

Tests: `python -m unittest discover -s tests -v` from `backend/` (33 tests,
no external services required — uses `sqlite:///:memory:` + `memory://`
redis stub via env defaults in `tests/test_api.py`).

Optional Postgres+Redis: `docker compose up -d postgres redis` from repo
root (just those two services — remap ports in `docker-compose.yml` first
if another project already has 5432/6379).

## Architecture

Layered: `app/api/*_routes.py` (HTTP + Pydantic schemas) → `app/services/*`
(business logic) → SQLAlchemy `app/models.py` → Postgres/SQLite.

- `app/main.py` — entry point, just calls `create_app()`
- `app/application.py` — composition root: CORS, security headers,
  TrustedHost (prod only), slowapi rate limiting, router registration
- `app/core/config.py` — `pydantic-settings` `Settings`, loads `.env`
- `app/core/security.py` — homegrown HMAC-signed bearer tokens (not JWT,
  but uses `hmac.compare_digest`; phone+OTP auth, no passwords)
- `app/core/limiter.py` — Redis-backed `slowapi.Limiter`
- `app/db.py` — SQLAlchemy engine/session. `expire_on_commit=False` is
  load-bearing: services read `dto()`/`serialize()` off `row.__dict__`
  right after `commit()`, so don't change this without checking callers.
- `app/api/auth_routes.py` — OTP send/verify, refresh, logout, profile
- `app/api/domain_routes.py` — everything else (produce, orders, barter,
  market, chat, crop, schemes, reviews, notifications)
- `app/services/domain_service.py` — `DomainService`, most business logic
- `app/services/auth_service.py` — `AuthService`
- `app/services/chat_ai.py` — Groq chat assistant (see AI features below)
- `app/services/crop_detection.py` — leaf disease model (see below)
- `app/bootstrap.py` — seeds market prices + a demo dealer on startup,
  idempotent, also does `Base.metadata.create_all`
- `tests/test_api.py` — main endpoint suite (23 tests)
- `tests/test_integrations.py` — chat_ai + crop_detection unit tests (10 tests)

Response envelope is always `{"data": ...}` — don't break this contract.

## AI features (integrated from teammates' branches)

Both were originally separate standalone services (root `app/` chatbot,
`AdityaMl` branch's `predict_server.py`) and have been folded directly into
`backend/` as real service modules — they are **not** run as separate
processes anymore.

**Chat assistant** (`app/services/chat_ai.py`, wired into `/api/chat/ask`):
Groq LLM call with live market-price context (pulled from the backend's own
`MarketPrice` table, not a separate sqlite db like the original) and live
weather context (OpenWeatherMap, Nagpur-fixed). Needs `GROQ_API_KEY` in
`.env` for real replies; without it, returns a static farming tip — this
fallback is intentional, not a bug.

**Crop disease detection** (`app/services/crop_detection.py`, wired into
`POST /api/crop/detect-disease` as a multipart file upload, auth required):
own trained Keras model (quality check → CLAHE enhance → test-time-augmented
prediction) with a Kindwise API second-opinion fallback on low confidence.
TensorFlow/OpenCV/numpy are imported **lazily inside functions**, not at
module level — the backend must keep booting and all other tests must keep
passing even on a machine without them installed. On this machine they
*are* installed (`backend/.venv`) and the real trained model files are
present at `backend/crop_model/phase4_outputs/model3_final.keras` +
`backend/crop_model/phase1_outputs/class_names.txt` (set via
`CROP_MODEL_ROOT`), so real inference actually runs end-to-end here —
verified via `test_detect_disease_runs_real_inference_when_model_available`.
On a machine missing any of these, the endpoint returns `503` instead of
crashing.

## Env vars (`backend/.env`, see `backend/.env.example`)

Core: `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`, `CORS_ORIGINS`.
Chat (optional): `GROQ_API_KEY`, `GROQ_MODEL`, `AGMARKNET_API_KEY`,
`OPENWEATHER_API_KEY`. Crop detection (optional): `KINDWISE_API_KEY`,
`CROP_MODEL_ROOT`, `CROP_CONFIDENCE_THRESHOLD`.

## Known stale cruft at repo root (not cleaned up yet)

These predate the AI-integration work and are now inconsistent with it —
flagged here so they aren't mistaken for current architecture, not yet
removed since nobody's asked:
- Root `Dockerfile` still does `COPY predict_leaf.py predict_server.py ./`
  — both files were deleted in the "removed unwanted files" cleanup. This
  Dockerfile no longer builds.
- Root `README.md` still has leftover WSL/`farmer-chatbot.zip` setup
  instructions and a walkthrough of `app/main.py`/`retrieval.py`/etc. —
  that standalone `app/` chatbot was deleted; its logic now lives in
  `backend/app/services/chat_ai.py`.
- `docs/architecture.md` describes the original Express/Node `src/`
  layered architecture (`src/routes`, `src/controllers`, ...) — `src/` was
  deleted; this doc describes a codebase that no longer exists.
- `static/test.html`, root-level `data/`, `.env`/`.env.example` — leftovers
  from the deleted standalone chatbot; `backend/` has its own `.env`.

## Working conventions

- Only `backend/` is real; don't add new code at repo root.
- Hackathon project — no Alembic migrations set up (schema is
  `create_all`-on-startup via `bootstrap.py`), keep it that way unless
  asked otherwise.
- Heavy/optional deps (tensorflow, opencv, numpy) must stay lazily
  imported inside functions, never at module level.
- User prefers terse responses and minimal token usage — verify with
  tests/greps rather than long narration, keep explanations short.
