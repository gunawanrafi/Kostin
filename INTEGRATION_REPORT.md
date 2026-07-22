# KostIn Phase 1 Integration Report

**Date:** 2026-07-14
**Scope:** Infrastructure startup, Prisma migration, health checks for auth/user/listing/booking/notification, and an end-to-end register → profile → listing → booking flow.

## 1. Infrastructure (`docker compose up -d`)

| Container | Status |
|---|---|
| `kostin-postgres-1` | Up, healthy |
| `kostin-redis-1` | Up, healthy |
| `kostin-mongo-1` | Up, healthy (created fresh — wasn't previously running) |

All three infra containers came up cleanly on the `kostin_net` bridge network with no errors.

## 2. Prisma migrate (`packages/database`)

```
Already in sync, no schema change or pending migration was found.
✔ Generated Prisma Client (v6.19.3)
```

Schema was already fully migrated from prior work. `npm run build` in `packages/database` regenerated `dist/` cleanly.

## 3. Service health checks

Services were run locally (`npm run dev` per service, against the dockerized Postgres/Redis on `localhost`) rather than via `docker compose --profile services up`, to keep iteration fast — all use the same `.env` connection strings either way.

| Service | Port | `/health` | Result |
|---|---|---|---|
| auth | 3001 | `GET /health` | ✅ `200 {"data":{"status":"ok"}}` |
| user | 3002 | `GET /health` | ✅ `200 {"data":{"status":"ok"}}` |
| listing | 3003 | `GET /health` | ✅ `200 {"data":{"status":"ok"}}` |
| booking | 3004 | `GET /health` | ✅ `200 {"data":{"status":"ok"}}` |
| notification | 3008 | `GET /health` | ✅ `200 {"data":{"status":"ok"}}` (after fix — see §5) |

## 4. End-to-end flow

All requests via `curl`, `Content-Type: application/json`, bearer tokens from `auth-service`.

| # | Step | Request | Result |
|---|---|---|---|
| 1 | Register owner | `POST auth:3001/auth/register` (role `OWNER`) | ✅ 201 — user + access/refresh tokens issued |
| 2 | Register student | `POST auth:3001/auth/register` (role `STUDENT`) | ✅ 201 |
| 3 | Create profile | `PATCH user:3002/users/me` (bearer = student token) | ✅ 200 — bio/university/major/yearOfStudy saved |
| 4 | Create listing | `POST listing:3003/listings` (bearer = owner token) | ✅ 201 — created with `status: "DRAFT"` |
| 5 | Book a DRAFT listing (negative check) | `POST booking:3004/bookings` (bearer = student token) | ✅ 409 `LISTING_NOT_BOOKABLE` — correctly rejected |
| 6 | Activate listing | `PATCH listing:3003/listings/:id` `{"status":"ACTIVE"}` (bearer = owner token) | ✅ 200 |
| 7 | Create booking | `POST booking:3004/bookings` (bearer = student token) | ✅ 201 — `status: "PENDING"`, `totalPrice: 9000000` (Rp 1.500.000 × 6 bulan) correctly derived from the listing's price |
| 8 | Read back booking | `GET booking:3004/bookings/:id` (bearer = student token) | ✅ 200 — matches what was created |

**Additional cross-service checks performed:**
- `GET user:3002/users/me` with a token minted by `auth-service` → ✅ 200. Confirms `JWT_SECRET` is correctly shared/verified across auth → user/listing/booking (all three independently verify the same HS256 token).
- `POST listing:3003/listings` with a **STUDENT** token → ✅ 403 `FORBIDDEN` ("Only owner accounts can manage listings"). Confirms the OWNER-only role gate is enforced using the role claim from the shared JWT, not a separate DB lookup that could drift.

No connection errors occurred between auth ↔ user ↔ listing ↔ booking during the flow. Every service reached Postgres and Redis without retry/timeout errors in its logs.

**Out of scope / not exercised:** `booking-service`'s `PATCH /bookings/:id/confirm` calls `escrow-service` (`ESCROW_SERVICE_URL`) to hold funds before confirming — `escrow-service` isn't one of the 5 services this check covers, so confirm/escrow was not tested. Booking *creation* has no dependency on escrow (it only schedules a BullMQ auto-cancel job), so this doesn't affect the flow above.

## 5. Issue found and fixed

### `notification-service` crashed on startup — unconditional Firebase Admin initialization

**Symptom:** `npm run dev` exited immediately with an unhandled exception:
```
FirebaseAppError: Service account object must contain a string "project_id" property.
    at new FirebasePushSender (src/lib/push-sender.ts:28:38)
    at <anonymous> (src/index.ts:10:20)
```

**Root cause:** `src/index.ts` unconditionally constructed `new FirebasePushSender({ projectId, clientEmail, privateKey })` at module load time. `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` are blank in `.env` (never provisioned — real FCM credentials are a Phase 2+ concern), and `admin.credential.cert()` throws synchronously on an empty `project_id`, taking down the whole process before Fastify ever bound to a port. This is exactly the kind of "connection error between services" the task asked me to find: any service that depends on `notification-service` (e.g. `booking-service` after a confirm/cancel, in a later phase) would have nothing to talk to.

**Fix:** Added a `NoopPushSender` (mirrors `auth-service`'s existing `NoopOtpSender` pattern for missing Twilio credentials) and only construct the real `FirebasePushSender` when all three Firebase env vars are actually present:

- `services/notification/src/lib/push-sender.ts` — added `NoopPushSender implements PushSender`.
- `services/notification/src/index.ts` — construct `FirebasePushSender` vs `NoopPushSender` based on whether `config.firebaseProjectId/firebaseClientEmail/firebasePrivateKey` are all non-empty.

With the fix: notifications still get created and are readable via `GET /notifications` (the in-app inbox); push delivery to a device is silently skipped when there's no FCM credential, same as it already silently skips when a user has no `fcmToken` registered (see `send-worker.ts`'s existing "no token = skip, not an error" comment).

**Verified:** `notification-service` now starts cleanly and responds `200` on `/health`. Its full test suite still passes: `tsc --noEmit` clean, `vitest run` → 4 files / 22 tests passed.

## Summary

| Check | Result |
|---|---|
| Infra up | ✅ |
| Prisma migrate | ✅ (already in sync) |
| 5/5 health endpoints | ✅ |
| Register → profile → listing → booking flow | ✅ |
| Cross-service JWT auth | ✅ |
| Role-based authorization | ✅ |
| Business rule enforcement (DRAFT not bookable) | ✅ |
| Issues found | 1 (notification-service startup crash) |
| Issues fixed | 1/1 |
