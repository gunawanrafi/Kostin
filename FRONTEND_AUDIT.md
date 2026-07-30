# Frontend Data Audit — `apps/web` Dashboard

**Date:** 2026-07-30
**Scope:** Every owner-facing page in `apps/web` — dashboard home, Properti Saya (listings), Tambah Kost (listings/new), Calon Penyewa (tenants), Keuangan (finance), plus login and register.
**Goal:** Distinguish data that is genuinely wired to a backend service from hardcoded/placeholder data presented as if it were real, so we know exactly what works before deciding what to fix. **No code was changed.**

## How data flows (context for the tables)

The browser never talks to backend services directly. Each page uses a React Query hook (`src/lib/hooks/*`) → the hook calls a same-origin Next.js Route Handler (`src/app/api/*`) → the Route Handler is a thin authenticated proxy (`src/lib/api.ts`) that attaches the httpOnly Bearer token and forwards to the Fastify service.

Backend services that are actually built and expose the endpoints the frontend calls (verified in `services/*/src/routes/*.routes.ts`):

| Service | Endpoint used by web | Exists? |
|---|---|---|
| auth-service | `POST /auth/login`, `POST /auth/register` | ✅ (login/register routes exist) |
| user-service | `GET /users/me` | ✅ |
| listing-service | `GET /listings` (incl. `?mine=true`), `POST /listings`, `POST /:id/photos` | ✅ |
| booking-service | `GET /bookings`, `PATCH /:id/confirm`, `PATCH /:id/cancel` | ✅ |
| notification-service | `GET /notifications` | ✅ |
| payment-service / escrow-service | (finance, withdrawals) | ❌ **not built — Phase 2** |

> **Cross-cutting caveat — listing counts are not true totals.** `listing-service` `GET /listings` uses **cursor pagination** and returns `meta = { nextCursor, limit }` with **no `total`** (`services/listing/src/services/listing.service.ts:66`). Every place in the web app that reads `data.meta.total` for listings gets `undefined` and falls back to counting only the items on the current (first) page. Bookings and notifications *do* return `meta.total`, so their counts are accurate.

---

## 1. Dashboard Home — `app/(dashboard)/page.tsx`

| Section / component | Real or Fake? | If real: source | If fake: real source & status |
|---|---|---|---|
| Greeting name ("Selamat pagi, {name}") | **REAL** | `useCurrentUser` → `/api/users/me` → user-service `GET /users/me` | — |
| KPI "Total Listing" | **REAL data, but count is unreliable** | `useListings({mine:true})` → `/api/listings?mine=true` → listing-service | Value falls back to `items.length` because listing-service returns no `meta.total`. Only counts the first page of listings, not the true total. Needs a real count endpoint. |
| KPI "Okupansi" | **FAKE** (honest placeholder — shows `—` / "Belum ada data") | — | Would come from per-room booking occupancy. booking-service exposes no occupancy metric. **Phase 2.** |
| KPI "Pendapatan Bulan Ini" | **FAKE** (honest placeholder `—`) | — | payment-service. **Not built — Phase 2.** |
| KPI "Penyewa Aktif" | **FAKE** (honest placeholder `—`) | — | Aggregate of active bookings; booking-service has no count endpoint. **Phase 2.** |
| "Aktivitas & Tugas Urgent" card | **FAKE** (honest empty state — "Belum ada aktivitas") | — | Would need a booking/payment/KYC event feed. No source exists. **Phase 2.** |

> The three `—` KPIs and the activity card are **honestly labeled placeholders**, not fake numbers dressed up as real. Only "Total Listing" presents a number that could mislead (page count ≠ total).

---

## 2. Properti Saya — `app/(dashboard)/listings/page.tsx`

| Section / component | Real or Fake? | If real: source | If fake: real source & status |
|---|---|---|---|
| Listings table (name, location, price, status) | **REAL** | `useListings({mine:true})` → `/api/listings?mine=true` → listing-service `GET /listings` | — |
| Loading / error / empty states | **REAL** (driven by the query state) | same as above | — |
| "Cari Properti" text field + "Cari" button | **FAKE / non-functional** | — | The `WField` has no `value`/`onChange` and the button has no handler. Typing does nothing; clicking Cari does nothing. Would need to be wired to a listing-service search/filter query. **Exists to wire, not built.** |
| "Lihat Detail" button (per row) | **Non-functional** | — | No `onClick`, no `href`. There is no listing-detail route in the app yet. |
| "Tambah Kost Baru" button | **REAL (navigation)** | Links to `/listings/new` | — |

---

## 3. Tambah Kost — `app/(dashboard)/listings/new/`

The final "Simpan & Publish" **does create a real listing** via `useCreateListing` → `POST /api/listings` → listing-service `POST /listings`. However, several fields the wizard collects are **silently discarded** — they are never sent to the API (see `mapFormToCreateListingInput` in `page.tsx`).

| Section / component | Real or Fake? | If real: source | If fake / discarded: real source & status |
|---|---|---|---|
| Step 1 — Nama, Deskripsi, Jenis Kost | **REAL** (sent) | mapped to `title`, `description`, `type` in `POST /listings` | — |
| Step 1 — Alamat, Kota, Kecamatan | **REAL** (sent) | mapped to `address`, `city`, `kecamatan` | `kelurahan` is **not collected** — the Kecamatan value is reused for both fields. |
| Step 1 — "Peta Interaktif" box | **FAKE placeholder** | — | Static box with a pin icon; no map, no picker. lat/lng are **hardcoded** to Malang city center (`FALLBACK_COORDS = -7.9666, 112.6326`) and sent as if chosen. Real source: Google Maps/Mapbox picker. **Not built.** |
| Step 2 — Jumlah Unit, Kapasitas | **Collected but DISCARDED** | — | `unitCount` and `capacity` are captured in form state but **never sent** to `POST /listings`. Backend room/capacity model would be the source. |
| Step 2 — Fasilitas Kamar / Bersama | **REAL** (sent) | merged into `amenities[]` in `POST /listings` | — |
| Step 3 — Foto Utama & Foto Kamar uploads | **FAKE (local only)** | — | Files become `URL.createObjectURL` blobs for preview only. listing-service **has** `POST /listings/:id/photos`, but the wizard **never calls it** — no photos are uploaded. Source exists; not wired. |
| Step 4 — Harga Sewa | **REAL** (sent) | mapped to `pricePerMonth` | — |
| Step 4 — Deposit toggle & Nominal Deposit | **Collected but DISCARDED** | — | `depositEnabled` / `deposit` captured but **never sent**. Needs a deposit field in listing/booking model. |
| Step 4 — "Live Preview" card + completeness % | **REAL (derived)** | Computed client-side from current form state | The "VERIFIED" badge in the preview is **hardcoded** decoration, not a real verification state. |

> **Bottom line:** creating a listing works, but a listing created through the wizard will be missing its photos, unit count, capacity, and deposit, and will always carry the same fallback coordinates.

---

## 4. Calon Penyewa — `app/(dashboard)/tenants/page.tsx`

| Section / component | Real or Fake? | If real: source | If fake: real source & status |
|---|---|---|---|
| Booking cards (list) | **REAL** | `useBookings` → `/api/bookings` → booking-service `GET /bookings` (server-scoped to the owner) | — |
| Filter tabs (Semua / Perlu Ditinjau / Dikonfirmasi / Dibatalkan) | **REAL** | Re-queries with `?status=` server-side | — |
| Booking amount, check-in date, duration | **REAL** | fields from the booking record | — |
| "Konfirmasi" button | **REAL** | `useConfirmBooking` → `PATCH /api/bookings/:id/confirm` → booking-service | — |
| "Batalkan" button | **REAL** | `useCancelBooking` → `PATCH /api/bookings/:id/cancel` → booking-service | — |
| Tenant name → shows "Penyewa #{id}" + initial avatar | **Placeholder for a real value** | booking record's `studentId` (real) | The **display name/photo is fake** — booking-service returns only `studentId`, not the profile. Real name/avatar live in user-service but are **not joined/fetched**. Honest fallback, not invented data. |
| Listing → "Listing #{id}", Room → "Kamar #{id}" | **Placeholder for a real value** | real `listingId`/`roomId` | Same as above — IDs are real, human-readable names are not resolved (would need a listing-service lookup). |
| "Cari Calon Penyewa" search field | **REAL (limited)** | Client-side filter over already-fetched bookings, matching on `studentId` substring | Works, but only filters by student **id** (not name, since names aren't available). |

---

## 5. Keuangan — `app/(dashboard)/finance/page.tsx`

**This entire page is fake.** Every number, transaction, and bank account is a hardcoded constant. Nothing on this page reads from any API.

| Section / component | Real or Fake? | Real source & status |
|---|---|---|
| KPI "Total Pendapatan Bulan Ini" (`Rp 18.450.000`, `+12%`) | **FAKE (hardcoded)** | payment-service revenue aggregate. **Not built — Phase 2.** |
| KPI "Saldo yang Dapat Ditarik" (`Rp 5.200.000`) + "Menunggu penyelesaian: Rp 2.500.000" | **FAKE (hardcoded `WITHDRAWABLE_BALANCE`)** | escrow-service balance. **Not built — Phase 2.** |
| KPI "Tagihan Belum Dibayar" (`Rp 1.200.000`, "2 Penyewa") | **FAKE (hardcoded)** | payment-service / booking invoices. **Not built — Phase 2.** |
| "Riwayat Transaksi" table (3 rows: Andi Pratama, token listrik, Siti Aminah) | **FAKE (hardcoded `TRANSACTIONS[]`)** | payment-service transaction ledger. **Not built — Phase 2.** |
| "Tarik Saldo" dialog — bank account list (BCA/Mandiri/BRI a.n. Pak Budi) | **FAKE (hardcoded `BANK_ACCOUNTS[]`)** | user/payment payout-accounts. **Not built.** |
| "Tarik Saldo" dialog — quick amounts & withdraw submit | **FAKE** | Submit is a `setTimeout(700ms)` then a success screen — an explicit `TODO: wire to payment-service POST /withdrawals`. No request is made. **Not built — Phase 2.** |

> ⚠️ This is the most misleading page in the app: it shows specific rupiah figures, named tenants, and masked bank accounts that a user would reasonably read as their real finances. It should be gated/labeled until payment-service and escrow-service exist.

---

## 6. Login — `app/(auth)/login/page.tsx`

| Section / component | Real or Fake? | If real: source | If fake: real source & status |
|---|---|---|---|
| Email + password sign-in | **REAL** | `useLogin` → `/api/auth/login` → auth-service `POST /auth/login`; sets httpOnly cookies | — |
| Error handling (401/400, offline) | **REAL** | derived from the real API response | — |
| "Lanjut dengan Google" button | **FAKE / non-functional** | — | Empty handler with `TODO: wire to auth-service POST /auth/login/google`. No Google OAuth endpoint exists yet. |
| "Lupa kata sandi?" link | **FAKE** | — | `href="#"` — no password-reset flow exists. |
| "Ingat saya" checkbox | **Non-functional** | — | Local state only; value is never sent to the API and does not affect token lifetime. |

---

## 7. Register — `app/(auth)/register/page.tsx`

The final "Kirim untuk Ditinjau" **does create a real account** via `useRegister` → `POST /api/auth/register` → auth-service. Only `name`, `email`, `phone`, `password`, `role: "OWNER"` are sent.

| Section / component | Real or Fake? | If real: source | If fake / discarded: real source & status |
|---|---|---|---|
| Step 1 — Nama Lengkap | **REAL** (sent as `name`) | `POST /auth/register` | — |
| Step 1 — No. HP | **REAL** (sent as `phone`, prefixed `+62`) | `POST /auth/register` | — |
| Step 1 — "Nama Kost / Usaha", "Kota" | **Collected but DISCARDED** | — | Never sent to any API. Would belong to a user/owner profile (user-service). Not wired. |
| Step 2 — Email, Password (+ confirm, agree) | **REAL** (email/password sent; confirm & agree are client-side validation only) | `POST /auth/register` | — |
| Step 3 — Verification docs (KTP, Foto Properti, Selfie Liveness) | **FAKE** | — | "Unggah" just flips a boolean to show a "Selesai" badge — **no file picker, no upload, no endpoint**. Real source: a KYC/verification upload flow. **Not built — Phase 2** (acknowledged in the code comment). |
| Step 3 — "Kirim untuk Ditinjau" | **Partially real** | Creates the account (real) | The "review/verification" it implies does **not** happen — docs are never transmitted. |

---

## 8. Shared shell (bonus — appears on every dashboard page)

| Section / component | Real or Fake? | Source |
|---|---|---|
| Sidebar owner name / role / avatar (`WSidebar`) | **REAL** | `useCurrentUser` → `/api/users/me` → user-service |
| Topbar owner name / avatar (`WTopBar` via `DashboardTopBar`) | **REAL** | `useCurrentUser` |
| Topbar notification bell **count** | **REAL** | `useUnreadNotificationCount` → `/api/notifications?status=UNREAD&limit=1` → notification-service (reads `meta.total`) |
| Topbar bell click (open notifications) | **Non-functional** | No `onNotificationsClick` handler passed; there is no notifications page/panel. |
| Topbar "Profil Saya" / "Pengaturan" menu items | **Non-functional** | No handlers passed; no profile/settings routes exist. |
| Topbar "Keluar" (logout) | **REAL** | `useLogout` → `/api/auth/logout` → auth-service |
| Footer links (Pusat Bantuan, etc.) | **FAKE / non-functional** | Plain `<span>`s, no links. |

---

## Summary — what actually works today

**Fully real & functional:**
- Login (email/password), Register (account creation), Logout
- Listings table (Properti Saya)
- Create listing (core fields only)
- Bookings list + Confirm/Cancel (Calon Penyewa)
- Current-user identity (sidebar/topbar) and unread notification count

**Real data but with a caveat:**
- Dashboard "Total Listing" — counts only the first page (no `total` from listing-service)
- Tenant/listing/room names on Calon Penyewa — real IDs, but no human-readable names (profiles not joined)
- Create-listing wizard — silently drops photos, unit count, capacity, deposit, and real map coordinates

**Entirely fake / placeholder:**
- **Keuangan (finance) — the whole page** (revenue, balance, bills, transaction history, bank accounts, withdrawal). Depends on payment-service + escrow-service, which are **not built (Phase 2)**.
- Register verification docs (KYC) — UI only, no upload
- Login "Google" button, "Lupa kata sandi", "Ingat saya"
- Listings search box + "Lihat Detail" button
- Register "Nama Kost"/"Kota" fields (discarded)
- Wizard "Peta Interaktif" box
- Topbar bell/profile/settings actions, footer links

**Honestly labeled placeholders (not misleading):**
- Dashboard Okupansi / Pendapatan / Penyewa Aktif KPIs (`—`, "Belum ada data") and the empty activity feed.

## Confidence notes
- Endpoint existence was verified by reading each service's route file — I did not run the services, so I can't confirm they return data at runtime, only that the routes and the frontend wiring exist and match.
- The `meta.total` absence for listings is confirmed in code (`listing.service.ts` returns `{ nextCursor }` only); booking/notification `meta.total` presence is likewise confirmed in their route files.
- "Discarded" wizard/register fields were confirmed by comparing the form state against exactly what the mapping functions send — those specific fields are not in the request payload.
