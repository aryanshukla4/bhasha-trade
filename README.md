# Bhasha Trade Backend

FastAPI and PostgreSQL backend for a vernacular-first agriculture marketplace. The implementation lives in [`backend/`](backend/README.md).

The backend follows the layered boundaries described in [the architecture guide](docs/architecture.md). The current API contract is kept stable during the module-by-module extraction.

## Run locally

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

The API starts at `http://localhost:4000`. Check `GET /health` first.

## Authentication flow

1. `POST /api/auth/send-otp` with `{ "phone": "+919876543210" }`
2. In development, use the returned `data.devOtp` (`123456`).
3. `POST /api/auth/verify-otp` with the phone, OTP, optional `name`, and `role`.
4. Send its `data.token` as `Authorization: Bearer <token>` for protected routes.

The development OTP is deliberately never returned in production. Replace the send-OTP provider boundary with MSG91, Twilio Verify, or Firebase before deployment, and set a strong `JWT_SECRET`.

## API groups

- `/api/auth`, `/api/languages`, `/api/user/language`
- `/api/market`, `/api/produce`, `/api/orders`
- `/api/barter`, `/api/chat`, `/api/crop`, `/api/weather`
- `/api/schemes`, `/api/reviews`, `/api/users`, `/api/notifications`

Seed data includes mandi prices and verified input dealers so `market` and `barter` can be demonstrated immediately. Live SMS, Bhashini, weather, crop-diagnosis, file storage, and push-notification providers remain explicit integration points rather than fabricated production results.

## Project structure

```text
src/
  config/         environment configuration
  controllers/    HTTP response and validation helpers
  middleware/     authentication and cross-cutting request concerns
  repositories/   SQLite persistence boundary
  providers/      SMS, AI, weather, storage, and ML integration boundaries
  app.js          Express API composition
  server.js       process startup
```
