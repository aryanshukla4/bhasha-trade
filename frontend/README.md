# Bhasha Trade — Frontend

React + Vite + TypeScript + Tailwind client for the FastAPI backend in
`../backend`. Covers every endpoint the backend exposes, with the interface
translated into the five languages `GET /api/languages` advertises.

## Run it

The backend must be running first:

```powershell
cd ..\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

Then, in a second terminal:

```powershell
cd frontend
npm install
npm run dev        # http://localhost:5173
```

`npm run build` typechecks (`tsc --noEmit`) and bundles to `dist/`.

### Redis note

`backend/.env` sets `REDIS_URL=redis://localhost:6379/0`, and the rate limiter
on `/api/auth/send-otp` and `/verify-otp` fails with a 500 if nothing is
listening there — so login breaks before the frontend is even involved. Either
start Redis (`docker compose up -d redis` from the repo root) or run the
backend with an in-memory limiter:

```powershell
$env:REDIS_URL = 'memory://'
python -m uvicorn app.main:app --reload --port 8000
```

## How it talks to the backend

**Through a Vite proxy, not CORS.** `backend/.env` pins `CORS_ORIGINS` to
`http://localhost:3000`, so a browser on `:5173` would be blocked. Instead
`vite.config.ts` proxies `/api` and `/health` to `http://localhost:8000`, and
the app only ever issues same-origin relative requests — no preflight, and no
backend configuration to change.

For a real deployment, either serve `dist/` behind the same origin as the API,
or add the frontend's origin to `CORS_ORIGINS`.

## Signing in

Auth is phone + OTP. While `APP_ENV != production` the backend returns the code
in the response as `devOtp` (always `123456`), and the login screen prefills it.
Any phone number works — an unknown number is registered on first verify, using
the name, role and language from the form.

A full demo needs two accounts, since a farmer cannot buy their own listing:

| Role | Phone | OTP |
|---|---|---|
| Farmer | `+919000000001` | `123456` |
| Buyer | `+919000000002` | `123456` |

Sign the buyer in from a second browser profile or a private window (tokens
live in `localStorage`, so two sessions can't share one profile).

## Layout

```
src/
  lib/
    types.ts     every DTO, matching the wire format exactly
    api.ts       fetch wrapper — envelope unwrap, error flatten, 401 retry
    auth.tsx     token storage, current user, sign in/out
    i18n.tsx     language context + useT()
    locales/     hi en mr ta te
    speech.ts    Web Speech API helpers (optional, degrades cleanly)
    readState.ts client-side notification read tracking
    format.ts    ₹ / date / id formatting
  components/    Layout, LanguageSelect, icons, and the ui/ kit
  pages/         one file per screen
```

## Things about the API worth knowing before editing

1. **Casing is asymmetric.** Request bodies are camelCase (`cropType`,
   `pricePerUnit`); most responses come from `dto()` in the backend, which
   reflects SQLAlchemy column names and returns **snake_case** (`crop_type`,
   `price_per_unit`, `is_read`). The user object, `verification-status`,
   `parse-request` and the various stubs are camelCase. `src/lib/types.ts`
   mirrors the wire exactly — there is deliberately no normalization layer.
2. **Success is `{"data": ...}`; errors are not enveloped** — they are
   `{"detail": ...}`, and FastAPI 422s make `detail` an array. `api.ts`
   unwraps and flattens both.
3. **`DELETE /api/produce/{id}` and `POST /api/auth/logout` return 204** with
   no body.
4. **Access tokens last 7 days**; a 401 triggers one refresh + retry, and a
   failed refresh drops you back to the login screen.
5. **The crop upload field must be named `photo`** — anything else is a 422.

## Known backend gaps the UI works around

Not bugs in this client:

- **No mark-notification-read endpoint.** `is_read` exists but nothing sets it,
  so read state is tracked per-device in `localStorage`.
- **`GET /api/produce` only returns `status === 'active'`.** A farmer's sold
  and reserved crops therefore can't appear under "My listings" — they're
  reachable through Orders instead, and the page says so.
- **No nested objects.** Orders carry only `listing_id`, so the Orders page
  fetches each listing to show crop names. Only `GET /api/barter/matches/{id}`
  nests its dealer.
- **`/api/market/nearby-mandis` ignores lat/lon** and returns the first three
  rows. The UI still sends real coordinates.
- **`/api/weather` is a stub** (`provider: "demo"`, no alerts).
- **`/api/chat/text-to-voice` always returns `audioUrl: null`**, so speech
  playback uses the browser's `speechSynthesis`; the endpoint is still called.
- **The barter parser only knows** `fertilizer|seeds|pesticide` wanted and
  `wheat|rice` offered (in English, romanized Hindi and Devanagari), which is
  why the parsed result stays editable rather than being trusted outright.
- **Crop detection returns 503** when TensorFlow/OpenCV or the model files are
  missing; the page shows an explanation instead of an error.

## Languages

UI strings live in `src/lib/locales/`. `en.ts` defines the key set and every
other locale is typed against it, so a missing or misspelled key is a compile
error. Unknown language codes fall back to English.

Changing the language updates the UI immediately and, when signed in, persists
via `PUT /api/user/language` — which is also what the chat assistant reads when
deciding what language to answer in.
