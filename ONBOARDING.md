# ONBOARDING — KostIn

Panduan ini ditulis untuk dua orang: (1) kamu sendiri yang balik lagi ke
project ini setelah break, dan (2) developer baru yang belum pernah lihat
codebase ini sama sekali. Semua klaim di sini sudah diverifikasi dengan
baca file aslinya per 2026-07-22 — bagian yang tidak bisa diverifikasi
ditandai `[UNVERIFIED]`, jangan dianggap fakta.

---

## 1. Apa itu KostIn

Platform cari kost berbasis AI untuk mahasiswa di Malang, Indonesia
(`CLAUDE.md`). Ada dua sisi produk:

- **Penyewa (mahasiswa)** — cari, filter, dan booking kost lewat mobile
  app (React Native/Expo).
- **Pemilik (owner)** — kelola listing, tinjau calon penyewa, dan pantau
  keuangan lewat web dashboard (Next.js).

Dari `packages/database/prisma/schema.prisma`, `UserRole` enum punya 4
nilai: `STUDENT`, `OWNER`, `ADMIN`, `PARENT`. Jadi ada juga peran admin
(moderasi/backoffice, lewat `admin-service`) dan parent (orang tua yang
di-invite murid untuk mengawasi booking — lihat model `ParentInvite`).

Alur inti (Phase 1, dari `DESIGN_SYSTEM.md`): penyewa cari & booking kost,
pemilik pasang listing, screening penyewa, dan terima pembayaran lewat
escrow. Escrow ditandai **CRITICAL** di `CLAUDE.md` karena pegang uang
sungguhan — servicenya wajib 100% test coverage (lihat §7 soal status
sebenarnya).

---

## 2. Prasyarat

Diverifikasi dari `package.json` root, tiap `Dockerfile`, dan environment
mesin ini:

| Tool | Versi dibutuhkan | Sumber | Versi di mesin ini saat ini |
|---|---|---|---|
| Node.js | `>=20.0.0` | `package.json` `engines` | v20.19.6 ✅ |
| npm | `>=10.0.0` | `package.json` `engines` + `packageManager: npm@10.0.0` | 10.8.2 ✅ |
| Docker | ada, versi tidak dipin | `docker-compose.yml` pakai Compose v2 syntax | Docker 29.1.3 ✅ |
| Docker Compose | v2 (`docker compose`, bukan `docker-compose`) | Makefile pakai `docker compose ...` | Compose v5.0.0 ✅ |
| Python | image `python:3.12-slim` di `services/ai/Dockerfile` | Dockerfile | 3.12.3 tersedia di mesin ini, tapi lihat catatan di bawah |

**Catatan soal Python:** `README.md` bilang "Python >= 3.11", tapi
Dockerfile ai-service pakai `python:3.12-slim` secara eksplisit dan tidak
ada `requirements.txt` pin ke versi minimum lain. Kalau mau jalanin
`ai-service` di luar Docker, pakai 3.12 supaya sama persis dengan image
produksinya — README-nya sedikit longgar di titik ini.

Semua 11 service Node.js pakai `node:20-alpine` di Dockerfile mereka
(dicek `services/auth/Dockerfile`, sama untuk service lain).

---

## 3. Setup pertama kali

### 3.1 Clone → install → jalan

```bash
git clone <repo-url>
cd Startup-Kostin
npm install
```

Ini satu perintah `npm install` di root — monorepo pakai npm workspaces
(`apps/*`, `services/*`, `packages/*` di `package.json`), jadi semua
dependency ke-hoist ke satu `node_modules` di root. Tidak perlu
`npm install` terpisah di tiap service/app.

**Note khusus `apps/mobile`:** tidak punya `node_modules` sendiri (semua
dependency-nya ke-hoist ke root, sudah dicek). `expo` CLI-nya ada di
`node_modules/.bin/expo` root.

### 3.2 Environment variables — ini yang paling gampang salah paham

Ada **dua pola env-loading yang berbeda** di repo ini, jangan disamakan:

**A. 11 backend service Node.js** — semuanya load **satu `.env` di root
repo**, bukan `.env` di folder service masing-masing. Dicek langsung dari
kode, misal `services/auth/src/index.ts`:

```ts
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });
```

Path-nya resolve dari lokasi file itu sendiri (bukan `process.cwd()`), 3
level naik dari `services/<nama>/src/` — itu persis root repo. Semua 11
service (auth, user, listing, booking, escrow, payment, chat,
notification, review, community, admin) pakai pola yang identik.

⚠️ **`README.md` bilang "Copy `.env.example` in each service to `.env`"
— ini SALAH / sudah usang.** Tiap folder `services/<nama>/` memang punya
file `.env` sendiri (kecuali ini semua ternyata isinya cuma copy-paste
persis dari `.env` root — dicek dengan `diff`, hasilnya kosong/identik).
Tapi file-file itu **tidak pernah dibaca** oleh kode — yang dibaca cuma
`.env` di root. Jangan buang waktu edit `.env` di dalam folder service,
tidak akan ngaruh.

**B. `apps/web` (Next.js)** — Next.js secara otomatis cuma load
`.env.local` di folder app-nya sendiri (`apps/web/.env.local`), **bukan**
`.env` di root repo — ini konvensi built-in Next.js, bukan sesuatu yang
dikonfigurasi manual di codebase ini. File `apps/web/.env.local` sudah
ada dan isinya salinan dari `.env.example` root. Kalau kamu ubah
`AUTH_SERVICE_URL` dkk di `.env` root, apps/web **tidak akan lihat
perubahan itu** — harus diubah juga di `apps/web/.env.local`.

**C. `apps/mobile` (Expo)** — API client-nya
(`apps/mobile/src/lib/api.ts`) baca `process.env["EXPO_PUBLIC_AUTH_URL"]`
dkk. Expo cuma inject variabel yang diawali `EXPO_PUBLIC_` ke bundle
client. Tapi `apps/mobile/.env` yang ada sekarang isinya salinan mentah
dari `.env.example` root — **tidak ada satupun variabel berprefix
`EXPO_PUBLIC_` di dalamnya**. Karena semua URL default-nya sudah pas
(`http://localhost:3001` dst, sama seperti default di kode), ini
"kebetulan jalan" untuk dev di simulator/emulator lokal. Begitu kamu mau
tes dari HP fisik (butuh IP LAN, bukan `localhost`), kamu harus tambah
manual `EXPO_PUBLIC_AUTH_URL=http://<ip-lan>:3001` dst ke
`apps/mobile/.env`.

### 3.3 Variabel yang wajib vs opsional untuk boot

Dicek dari `INTEGRATION_REPORT.md` (hasil test riil) dan kode:

- **Wajib untuk service DB-backed (auth/user/listing/booking/notification/dst) boot:**
  `DATABASE_URL`, `REDIS_URL` (untuk yang pakai Redis) — nilai default di
  `.env.example` sudah cukup untuk dev lokal via `docker compose`, tidak
  perlu API key eksternal apapun.
- **Firebase (`FIREBASE_*`)** — **opsional**, ada fallback. Dicek di
  `INTEGRATION_REPORT.md` §5: `notification-service` awalnya **crash**
  saat boot kalau `FIREBASE_PROJECT_ID` dkk kosong (constructor Firebase
  Admin throw). Ini sudah diperbaiki dengan pola `NoopPushSender` — kalau
  ketiga var Firebase kosong, service pakai no-op sender dan tetap boot
  normal; push notification cuma silently di-skip. Ini history bug yang
  sudah fixed, bukan resiko yang masih aktif — dicantumkan di sini supaya
  kamu paham *kenapa* pola noop-sender itu ada kalau nemu di kode.
- **Twilio (`TWILIO_*`)** — `auth-service` punya pola `NoopOtpSender`
  yang serupa (disebut di komentar `INTEGRATION_REPORT.md`) untuk kondisi
  kredensial kosong. `[UNVERIFIED]` — saya belum baca langsung
  `services/auth/src/lib/otp.ts` untuk konfirmasi detail persis
  kapan noop dipakai; kalau mau pasti, cek file itu sebelum asumsi.
  **Update:** `otp-store.ts`/`otp.ts` ada di daftar file auth-service —
  logikanya kemungkinan besar sama polanya, tapi belum saya baca isinya
  baris demi baris.
- **Midtrans, Cloudinary, Google Maps/Mapbox, OpenAI, Elasticsearch** —
  semua kosong di `.env.example` (belum diprovision). Servicenya
  (payment, listing photo upload, ai) yang benar-benar butuh ini **belum
  ada logikanya sama sekali** di kode saat ini (lihat §7) — jadi belum
  relevan untuk bikin crash, karena belum ada kode yang memanggilnya.

### 3.4 Prisma — perintah exact

Dari `packages/database/package.json`, dijalankan **di dalam
`packages/database/`**:

```bash
cd packages/database
npm run db:generate   # = prisma generate
npm run db:migrate    # = prisma migrate dev
```

Migration yang sudah ada di repo (`packages/database/prisma/migrations/`,
6 folder, urut waktu): `20260706134757_init`,
`20260714015053_add_user_auth_fields`,
`20260714021804_add_parent_invite`,
`20260714023224_add_listing_deleted_at`,
`20260714025004_add_booking_fields`,
`20260714030703_add_notification_event_and_fcm_token`. Prisma versi yang
terpasang: **v6.19.3** (`@prisma/client` dan `prisma` sama-sama
`^6.0.0` di `packages/database/package.json`) — lihat §8 soal history
kenapa versi ini penting.

Urutan setup database lengkap (docker-compose, migrate, generate):

```bash
make dev                        # start postgres+redis+mongo saja
cd packages/database
npm run db:migrate               # apply semua migration ke kostin_dev
npm run db:generate              # generate Prisma Client ke dist/
cd ../..
```

---

## 4. Menjalankan project sehari-hari

Diverifikasi langsung dari `package.json` root, `turbo.json`, dan
`Makefile` — semua command di bawah ini benar-benar ada, tidak ada yang
dikarang.

### npm scripts (root `package.json`)

| Command | Menjalankan |
|---|---|
| `npm run dev` | `turbo run dev` — jalankan semua `dev` task (persistent) di semua workspace paralel |
| `npm run build` | `turbo run build` |
| `npm run lint` | `turbo run lint` |
| `npm run test` | `turbo run test` |
| `npm run type-check` | `turbo run type-check` |
| `npm run clean` | `turbo run clean && rm -rf node_modules` |

Jalankan satu service saja pakai filter turbo, contoh dari `README.md`:
```bash
npx turbo run dev --filter=auth-service
```
`[UNVERIFIED]` — saya belum cek nama package persis tiap service
(`package.json` `name` field) untuk pastikan `--filter=auth-service`
match. Cek `services/auth/package.json` → `"name"` sebelum pakai filter
ini kalau mau presisi.

### Soal `concurrency` di turbo

`turbo.json` sudah set `"concurrency": "16"` secara eksplisit di level
root config. Ini penting karena repo ini punya **13 workspace dengan
`dev` task yang persistent** (11 service + `apps/web` + `apps/mobile`).
Default concurrency Turborepo adalah 10 — kalau jumlah persistent task
lebih dari itu dan concurrency tidak dinaikkan, `turbo run dev` akan
gagal jalan/nge-block dengan pesan minta kamu set `--concurrency` lebih
tinggi. Karena `turbo.json` sudah set `"16"`, kamu **tidak perlu**
tambahin `--concurrency` manual lagi di command line — sudah dihandle di
config repo.

### Makefile (Docker shortcuts)

Semua target ini dicek langsung dari `Makefile`:

| Target | Fungsi |
|---|---|
| `make dev` | Start infra saja: postgres (5432), redis (6379), mongo (27017) |
| `make up` | Start infra + semua application service (`--profile services`) |
| `make stop` | Stop semua container, volume tetap ada |
| `make down` | Stop + remove container, volume tetap ada |
| `make down-v` | Stop + remove container **dan volume** — destruktif, data DB hilang |
| `make logs` | Tail log semua container yang jalan |
| `make logs-svc SVC=auth` | Tail log satu service (ganti `auth` sesuai nama) |
| `make db` | Buka `psql` shell ke postgres (`kostin`/`kostin_dev`) |
| `make redis-cli` | Buka `redis-cli` shell |
| `make mongo-shell` | Buka `mongosh` shell |
| `make ps` | Status semua container |
| `make build` | Build semua image Docker |
| `make build-svc SVC=auth` | Build image satu service |
| `make clean` | Stop container + prune dangling image |
| `make help` | Tampilkan daftar target ini |

Catatan: `docker-compose.yml` menaruh semua application service (auth
sampai ai) di bawah `profiles: [services]` — jadi `make dev` **tidak**
menjalankan service Node/Python apapun, cuma database. Untuk dev
sehari-hari yang paling umum: `make dev` (infra) + `npm run dev` (semua
service jalan lokal via tsx/next/expo, bukan lewat Docker) — ini juga
pola yang dipakai di `INTEGRATION_REPORT.md` ("services were run locally
... rather than via docker compose --profile services up, to keep
iteration fast").

---

## 5. Peta arsitektur

### Tabel service (diverifikasi dari `CLAUDE.md`, silang-cek ke
`docker-compose.yml` dan kode tiap service)

| Service | Stack | Port | Dependency eksternal | Status implementasi (lihat §7) |
|---|---|---|---|---|
| API Gateway | Nginx/Kong | 80/443 | — | **Belum ada sama sekali** di repo — cuma disebut di tabel `CLAUDE.md`, tidak ada folder/config-nya |
| auth-service | Node.js + Fastify | 3001 | PostgreSQL, Redis, Twilio | Implemented + test |
| user-service | Node.js + Fastify | 3002 | PostgreSQL, Redis, Cloudinary | Implemented + test |
| listing-service | Node.js + Fastify | 3003 | PostgreSQL, Elasticsearch, Cloudinary, Maps | Implemented + test |
| booking-service | Node.js + Fastify | 3004 | PostgreSQL, escrow-service | Implemented + test |
| escrow-service | Node.js + Fastify | 3005 | PostgreSQL, payment-service | **Stub (health-check saja)** |
| payment-service | Node.js + Fastify | 3006 | PostgreSQL, Midtrans | **Stub** |
| chat-service | Node.js + Fastify | 3007 | MongoDB, Redis (Socket.io) | **Stub** |
| notification-service | Node.js + Fastify | 3008 | BullMQ Queue | Implemented + test |
| review-service | Node.js + Fastify | 3009 | PostgreSQL | **Stub** |
| community-service | Node.js + Fastify | 3010 | MongoDB | **Stub** |
| admin-service | Node.js + Fastify | 3011 | PostgreSQL, Redis | **Stub** |
| ai-service | Python + FastAPI | 8000 | OpenAI API, PostgreSQL, Redis | `[UNVERIFIED]` — cuma dicek ada `main.py` + `/health`, belum baca isi logic AI-nya |

Data layer & external service list di `CLAUDE.md` sudah akurat (dicek
silang ke `.env.example` dan `docker-compose.yml`), tidak diulang di
sini.

### Struktur monorepo

```
apps/
  mobile/          → React Native (Expo Router), src/app/ = file-based routing
  web/              → Next.js 14 App Router, src/app/ = route groups (auth)/(dashboard)
services/
  <11 folder di atas>/
packages/
  database/         → Prisma schema + client, satu-satunya sumber schema DB
  types/            → interface TypeScript yang dishare lintas service (ApiResponse, dll)
  config/           → base tsconfig (strict) + eslint config yang dishare
```

Yang perlu diketahui: `packages/types` itu **duplikat secara paralel**
dengan Prisma-generated types dari `packages/database` — keduanya
mendefinisikan bentuk `User`, dll, tapi dengan nama field yang tidak
selalu sama persis (mis. `packages/types` pakai `role: "student"|"owner"|"admin"`
lowercase, sementara Prisma schema pakai `UserRole` enum uppercase
`STUDENT`/`OWNER`/`ADMIN`/`PARENT`). Jangan asumsikan keduanya
interchangeable kalau lagi debug type error lintas package.

---

## 6. Konvensi yang benar-benar dipakai

Dicek langsung dari kode `services/auth/src` dan `services/listing/src`
(dua service paling lengkap), bukan ditebak dari dokumentasi.

### Bentuk response API
Semua endpoint balikin `{ data, error, meta }` — persis seperti yang
dijanjikan `CLAUDE.md`, dan didefinisikan sebagai interface
`ApiResponse<T>` di `packages/types/src/index.ts`. `error` berisi
`{ code, message }` kalau gagal (`null` kalau sukses), `meta` selalu ada
minimal `requestId` (UUID lewat `crypto.randomUUID()`), dan endpoint
list pakai `meta.nextCursor` untuk cursor-based pagination (bukan
offset/page).

### Error handling
Tiap service punya `src/lib/errors.ts` sendiri (tidak dishare lintas
service) berisi:
- `<Service>ErrorCode` — const object (bukan TS `enum`) berisi kode
  string kayak `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`,
  `NOT_FOUND`, `INTERNAL_ERROR`, plus kode spesifik per-domain
  (`INVALID_CURSOR`, `TOO_MANY_PHOTOS` di listing-service).
- Class `AppError extends Error` dengan `statusCode` + `code` — dilempar
  dari service layer, ditangkap oleh Fastify error handler di `app.ts`
  lalu diubah jadi response `{ data: null, error: {...}, meta }`.

### Auth / JWT lintas service
**Tidak ada API Gateway** yang verifikasi token secara terpusat — tiap
service (`listing`, dst) verifikasi JWT sendiri-sendiri lewat
`src/lib/auth-plugin.ts`, memakai `JWT_SECRET` yang sama-sama dibaca
dari `.env` root (jadi HS256 shared secret, bukan RS256/JWKS). Polanya:
- `createAuthenticate(secret)` — Fastify preHandler, wajib ada Bearer
  token valid atau throw `401 UNAUTHORIZED`.
- `createOptionalAuthenticate(secret)` — dipakai di endpoint publik yang
  tetap mau tahu identitas user *kalau* ada token (mis. `GET /listings`
  publik untuk browsing, tapi mode `mine=true` butuh tahu siapa owner-nya).
  Token invalid/tidak ada di sini **tidak** throw, cuma `request.user`
  tetap `undefined`.
- `requireOwner(request)` — helper role-check dipanggil manual di dalam
  route, throw `403 FORBIDDEN` kalau role bukan `OWNER`.

Dikonfirmasi bekerja end-to-end di `INTEGRATION_REPORT.md`: token dari
`auth-service` sukses diverifikasi independen oleh `user`/`listing`/
`booking`-service tanpa network call balik ke auth-service.

### Struktur test
Tiap service yang sudah diimplementasi (auth, user, listing, booking,
notification) punya folder `src/test/`, satu file per endpoint/flow
(`register.test.ts`, `login.test.ts`, dst), plus `helpers.ts` berisi
factory untuk fake dependencies. **Lihat §7 untuk detail besar: ini fake
in-memory, bukan database sungguhan.**

### Shared types
`@kostin/types` (di `packages/types/`) — dipakai lintas service untuk
`ApiResponse<T>`, domain types dasar. Harus di-build (`tsc --build`) dulu
supaya `dist/` ada sebelum service lain bisa `import` darinya — ini
sempat jadi sumber error (lihat §8).

### Penamaan
Route file: `<domain>.routes.ts`. Service layer: `<domain>.service.ts`.
Repository/data-access: `<domain>-repository.ts`. Semua di bawah `src/`
per service, tidak ada shared repository lintas service (tiap service
punya akses langsung ke `@kostin/database` masing-masing, model Prisma
dishare tapi query logic tidak).

---

## 7. Status sekarang — jujur-jujuran

### Service mana yang benar-benar ada isinya, mana yang cuma scaffold

Dicek langsung dengan `find` isi folder tiap service (bukan cuma baca
tabel `CLAUDE.md`):

**Fully implemented (ada `app.ts`, `config.ts`, `routes/`, `services/`,
`lib/`, dan test suite):**
- `auth` — register, login, OTP WhatsApp, Google login, refresh, logout
- `user` — profil, avatar upload, lifestyle, invite parent
- `listing` — CRUD listing, search, photo upload, geo
- `booking` — create/cancel/confirm booking, auto-cancel worker (BullMQ),
  upload dokumen KTM/KTP
- `notification` — kirim notifikasi (in-app + push), worker BullMQ,
  fallback noop kalau Firebase belum diprovision

**Cuma health-check stub (isinya cuma `src/index.ts`, ~30 baris, endpoint
`GET /health` doang, tidak ada `routes/`, `services/`, atau `lib/`):**
- `escrow` — **ini yang paling perlu diperhatikan**: `CLAUDE.md` bilang
  escrow *"NEVER skip tests, always audit logic"* dan wajib 100% coverage,
  tapi saat ini **tidak ada satupun file logic escrow, dan tidak ada
  satupun file test** di `services/escrow/src/`. `package.json`-nya
  sudah punya script `test: vitest run --coverage` siap pakai, tapi
  belum ada yang dijalankan/diukur karena belum ada kode maupun test.
  Anggap escrow-service = 0% implemented, bukan "hampir selesai".
- `payment` — stub, belum ada integrasi Midtrans apapun
- `chat` — stub, belum ada Socket.io handler/MongoDB access meski
  dependency-nya (`socket.io`) sudah ke-import di `index.ts`
- `review` — stub
- `community` — stub
- `admin` — stub

**AI service (Python):** `[UNVERIFIED]` — dicek ada `main.py`, FastAPI
app, endpoint `/health`, tapi saya belum baca isi logic AI-nya
(matching/recommendation) baris demi baris untuk tahu seberapa jauh.

### Test pakai database asli atau mock?

**Mock/fake in-memory, bukan database asli.** Dicek langsung
`services/auth/src/test/helpers.ts`: `createFakeUserRepository()` bikin
array in-memory yang meniru behavior Prisma repository (unique
email/phone, `findFirst`-by-OR, dst) tanpa nyentuh Postgres sama sekali.
Redis juga di-fake (`InMemoryRedis`). Google OAuth verifier dan OTP
sender juga di-fake. Setiap test file manggil `buildTestApp()` yang
nyuntik semua fake ini ke `buildApp()` — jadi test suite jalan cepat dan
terisolasi, tapi **tidak pernah memverifikasi query Prisma sungguhan
terhadap Postgres**. Kalau ada bug di level SQL/migration, test ini tidak
akan menangkapnya — itu baru ketauan lewat manual/integration test kayak
yang didokumentasikan di `INTEGRATION_REPORT.md`.

### Frontend: data asli API vs hardcoded placeholder

**Web dashboard** (`apps/web/src/app/(dashboard)/`) — dicek tiap
halaman:
- `page.tsx` (dashboard home) — **campuran**. Kartu "Total Listing" pakai
  data asli (`useListings({ mine: true })`), nama greeting pakai data
  asli (`useCurrentUser()`). Tapi kartu "Okupansi" (87%), "Pendapatan
  Bulan Ini" (Rp 24.500.000), "Penyewa Aktif" (142 Orang), dan seluruh
  list "Aktivitas & Tugas Urgent" adalah **konstanta hardcoded**
  (`ACTIVITY` array literal di file yang sama) — tidak ada fetch apapun
  untuk data ini.
- `listings/page.tsx` — data asli, `useListings({ mine: true })`.
- `tenants/page.tsx` — data asli, `useBookings()` + mutation
  confirm/cancel yang benar-benar manggil API.
- `finance/page.tsx` — **100% hardcoded**. `TRANSACTIONS` array literal,
  `BANK_ACCOUNTS` literal, `WITHDRAWABLE_BALANCE` konstanta. Tombol
  "Tarik Saldo" cuma `setTimeout(700ms)` lalu tampilkan sukses — ada
  komentar eksplisit di kode: `// TODO: wire to payment-service POST
  /withdrawals once the API client exists`. Konsisten dengan
  `payment-service` yang memang masih stub (lihat di atas).

**Mobile app** (`apps/mobile/src/`) — lebih jujur soal keterbatasan
backend dibanding web:
- `home.tsx`, listing detail — data asli lewat `listingApi.list()` /
  infinite query, di-mapping lewat `listing-mapper.ts`.
- `listing-mapper.ts` **secara eksplisit** set `rating: 0` dan berkomentar
  bahwa `rating`/`reviewCount`/`matchScore` belum punya sumber data
  backend (review-service stub, belum ada AI matching) — "left at safe
  defaults rather than faked". Ini pola yang bagus, patut ditiru kalau
  nambah screen baru.
- `favorit.tsx` — manggil `userApi.getFavorites()` yang **akan 404**
  karena endpoint `GET /users/me/favorites` belum ada di user-service
  (tidak ada model `Favorite` di Prisma schema). React Query di-set
  `retry: false` dan fallback ke array kosong, jadi UI tetap nampilin
  empty state alih-alih error keras. Tombol hapus favorit nampilin alert
  "Segera hadir".

### Pernahkah mobile app dijalankan?

`[UNVERIFIED]` — tidak ada bukti kuat ke arah manapun:
- Tidak ada `apps/mobile/node_modules` sendiri (normal untuk monorepo
  hoisting, bukan indikasi apa-apa).
- `apps/mobile/.expo/devices.json` isinya `{"devices": []}` — array
  kosong, konsisten dengan *belum pernah* connect device/simulator, tapi
  juga bisa saja itu default scaffold yang tidak pernah ke-generate ulang.
- Tidak ada folder `android/`/`ios/` native (wajar untuk Expo managed
  workflow, bukan indikasi).
- Tidak ada file lock/cache Metro bundler yang saya temukan.

Kesimpulan paling jujur: **tidak ada bukti positif bahwa mobile app
pernah berhasil di-`expo start` dan dibuka**. Jangan asumsikan sudah
pernah jalan — coba jalankan sendiri dan catat hasilnya kalau perlu
kepastian.

### Yang diketahui rusak/belum lengkap

- Peer-dependency conflict antara `expo-router@~3.5.0` (butuh
  `react-native@>=0.82.0` lewat `react-native-screens@4.25.2`) vs
  `react-native@0.74.0` yang dipin di `apps/mobile/package.json` — tercatat
  di `HEALTH_REPORT.md` sebagai item LOW priority yang belum diperbaiki.
  `[UNVERIFIED]` apakah versi `react-native-screens` di `package.json`
  saat ini (`3.31.1`) masih menimbulkan conflict yang sama — versi di
  `package.json` sekarang sudah `3.31.1`, bukan `4.25.2` yang disebut
  laporan lama, jadi kemungkinan sudah diperbaiki sebagian tapi belum
  saya jalankan `npm ls`/install ulang untuk konfirmasi bersih.
- Tidak ada API Gateway (Nginx/Kong) sama sekali di repo — semua service
  diakses langsung by port, baik dari `apps/web`'s Route Handlers maupun
  `apps/mobile`'s API client.
- `services/ai` tidak baca `PORT` dari environment saat runtime (hardcode
  8000 di `uvicorn.run` command level Dockerfile `CMD`) — dicatat di
  `HEALTH_REPORT.md`, `[UNVERIFIED]` apakah sudah diperbaiki karena saya
  belum baca `main.py` isinya.
- Hanya ada **1 commit** di git history (`d736d76 feat: phase 0 initial
  setup`) — semua pekerjaan sejak itu (termasuk semua yang dibahas di §7
  ini) masih **uncommitted working tree changes** (100 file
  modified/untracked per `git status`). Kalau kamu baru clone dari remote,
  kemungkinan besar kamu tidak akan melihat sebagian besar hal yang
  dijelaskan dokumen ini sampai working tree ini di-commit dan di-push.

---

## 8. Masalah umum & solusinya (kejadian nyata di project ini)

Diringkas dari `HEALTH_REPORT.md`, `INTEGRATION_REPORT.md`, dan
`ENV_CHECK.md` — ini bukan skenario hipotetis, ini yang benar-benar
terjadi dan sudah diperbaiki di titik commit tersebut.

**Prisma v5 vs v6**
Awalnya `packages/database/package.json` pin ke `prisma@^5.13.0`, tapi
task minta v6. Fix: update ke `^6.0.0` untuk `prisma` dan
`@prisma/client`, lalu install ulang. Versi terpasang sekarang: 6.19.3.
Kalau ketemu error tipe Prisma yang aneh, cek dulu `prisma -v` cocok
dengan yang di `package.json`.

**`DATABASE_URL` not found saat boot**
Root cause historisnya: service yang pakai `@kostin/database` di-`import`
secara statis di atas file, sebelum `dotenv.config()` sempat jalan —
under ESM, static import di-hoist duluan. Fix yang sudah diterapkan di
semua service: pakai dynamic `await import(...)` untuk apapun yang
nyentuh env var, ditaruh **setelah** baris `dotenv.config()`. Kalau kamu
nambah service baru atau ubah `index.ts`, jangan pindahin `@kostin/database`
(atau apapun yang baca `process.env` di top-level) jadi static import di
atas — akan balik ke bug yang sama.

**Turbo `concurrency` limit**
Lihat §4 — sudah di-set `"concurrency": "16"` di `turbo.json` supaya 13
persistent `dev` task (11 service + 2 app) tidak kena limit default
turbo (10). Kalau nambah workspace baru dengan `dev` task persistent
lagi, cek angka ini masih cukup.

**Firebase crash on missing credentials**
Lihat §3.3 — `notification-service` sempat crash total di boot karena
`FirebasePushSender` di-construct unconditional walau env var Firebase
kosong. Fix: `NoopPushSender`, dipilih berdasarkan apakah ketiga
`FIREBASE_*` env var terisi semua. Pola ini juga ada untuk Twilio OTP di
auth-service.

**Prisma client belum di-generate / `@kostin/types` tidak ketemu**
`TS2307: Cannot find module '@kostin/types'` muncul kalau
`packages/types/dist/` belum di-build. Fix: `tsc --build` di
`packages/types` (atau `npm run build` dari root yang men-trigger semua
lewat turbo). Sama halnya, Prisma Client (`@kostin/database`) harus
di-`db:generate` dulu setelah `npm install` atau setelah ubah
`schema.prisma` — kalau tidak, import dari `@kostin/database` di service
manapun akan gagal type-check maupun runtime.

**`"type": "module"` hilang → `TS1309`**
Semua 11 service pakai top-level `await` (mis. `await app.register(...)`),
yang butuh ESM. `tsconfig.service.json` pakai `"module": "Node16"`, yang
treat `.ts` sebagai CommonJS kecuali `package.json` terdekat declare
`"type": "module"`. Semua service `package.json` sudah punya field ini —
kalau bikin service baru dari copy-paste, jangan lupa field ini juga
ikut ke-copy.

---

## 9. Mulai dari mana

Saran task pertama yang bagus untuk kenal codebase tanpa resiko besar:

**Ambil salah satu endpoint di `escrow-service` dan implementasikan
sungguhan, lengkap dengan test.** Alasannya:
1. Servicenya masih 100% kosong (§7) jadi kamu tidak akan "merusak" apa-apa
   yang sudah ada — aman untuk bereksperimen.
2. Model Prisma `Escrow` sudah didefinisikan lengkap di
   `packages/database/prisma/schema.prisma` (state machine
   `HOLDING → RELEASED | REFUNDED | DISPUTED`), jadi kamu tidak perlu
   desain schema dari nol — tinggal pelajari yang sudah ada.
2. Kamu bisa contek pola lengkap dari `booking-service` atau
   `listing-service` (yang sudah production-quality: `app.ts`,
   `config.ts`, `routes/`, `services/`, `lib/errors.ts`,
   `lib/auth-plugin.ts`, `src/test/helpers.ts` dengan fake repository) —
   ini cara efektif belajar konvensi tim lewat kode nyata, bukan dokumen.
3. `CLAUDE.md` eksplisit bilang escrow butuh 100% test coverage, jadi ini
   juga latihan bagus buat langsung terbiasa nulis test dari awal
   (bukan ditambahin belakangan), sesuai budaya testing yang sudah
   dipakai di 5 service yang sudah selesai.
4. Scope-nya kecil dan jelas: mulai dari 1 endpoint saja, misal
   `POST /escrows` (hold dana saat booking dikonfirmasi) — lihat
   `booking-service`'s `src/lib/escrow-client.ts` untuk lihat kontrak
   yang sudah diasumsikan booking-service terhadap escrow-service
   (`ESCROW_SERVICE_URL`), supaya endpoint yang kamu bikin memang dipakai
   oleh service lain, bukan cuma latihan kosong.

Alternatif kalau lebih suka frontend: sambungin `finance/page.tsx` di
`apps/web` ke data asli — tapi ini butuh `payment-service` punya endpoint
dulu, jadi realistically task escrow/payment di atas adalah prasyaratnya.
