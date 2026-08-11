# GAP_ANALYSIS.md — Owner Web (Pemilik) Design vs. Built

**Date:** 2026-08-11
**Design source of truth:** `design-frontend /KostIn Web Pemilik - Standalone.html`
**Built source:** `apps/web/src`

---

## 0. Provenance notes (read first)

Three things worth recording before the table, because they affect how you use this document:

1. **The design directory name has a trailing space** — it is `design-frontend ` (with a space), not `design-frontend`. Any tooling or script that hardcodes the path without the space will silently fail to find it.
2. **Three owner files exist and are byte-identical.** `KostIn Web Pemilik - Standalone.html`, `…(1).html`, and `…(2).html` all have md5 `0a983dc74aee45f49f3f5f00a1d57859`. There is no newer variant hiding in `(2)` — you can delete two of them without losing anything.
3. **The HTML is a self-extracting bundle, not readable markup.** It is 212 lines / 1.8 MB: a gzipped base64 asset map on line 202 plus a bootstrap loader. The real design is 22 Babel/JSX modules inside it. The authoritative screen list comes from the final inline `<script type="text/babel">` in the extracted entry document, which renders `<DesignCanvas>` with explicitly labelled `<DCSection>` / `<DCArtboard>` nodes. That canvas — not a visual reading — is what this document is built from.

**Design defines 44 artboards across 13 sections (A–M).**

One screen in the design source is deliberately excluded: `AI Listing Optimizer` in module `10_731d2e93.js` is marked `ARCHIVED — not shown in canvas` and is not rendered by `App()`. It is not a gap.

---

## 1. Scorecard

| Built? | Count | Share |
|---|---|---|
| Fully | **0** | 0% |
| Partially | **13** | 30% |
| Not at all | **31** | 70% |

Zero screens are a full match. That is not a criticism of the build — the 13 partials are real, working, honestly-empty pages wired to live services. But no screen currently reaches design parity, so "finish the frontend" is 44 discrete items, not a polish pass.

**Routes that exist:** `/login`, `/register`, `/` (dashboard), `/listings`, `/listings/new`, `/tenants`, `/finance`.
**Sidebar in design lists 10 nav items; the built sidebar lists 4.** The other 6 (`Penyewa Aktif`, `Pesan`, `Pengaturan`, `Perawatan`, `Analitik`, `Inquiry`) have no route at all — `WSidebar.tsx` documents this deliberately rather than shipping 404 links.

---

## 2. Backend inventory (what the gaps are measured against)

**Services with a real implementation:**

| Service | Routes |
|---|---|
| auth (3001) | `POST /register`, `/login`, `/login/google`, `/logout`, `/refresh`, `/otp/request`, `/otp/verify` |
| user (3002) | `GET /me`, `PATCH /me`, `POST /me/avatar`, `PUT /me/lifestyle`, `POST /invite/parent` |
| listing (3003) | `GET /`, `POST /`, `GET /search`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `POST /:id/photos` |
| booking (3004) | `GET /`, `POST /`, `GET /:id`, `PATCH /:id/confirm`, `PATCH /:id/cancel`, `POST /:id/documents`, `GET|PUT /draft/:listingId` |
| notification (3008) | `GET /`, `POST /send`, `PATCH /:id/read` |

**Services that are health-check stubs only** (a single `src/index.ts` with `GET /health` and nothing else): **escrow, payment, review, chat, community, admin**. `ai` has only `main.py`.

**Prisma has the models but no service exposes them:** `Room`, `Escrow`, `Payment`, `Review`, `ChatRoom`, `ChatMessage`. The `Room` model existing without a rooms API is the single most load-bearing gap in this document — it blocks B1, C1, C3, E1, E2, and J1–J3.

**Next.js `/api` proxy coverage is narrower than the services behind it.** Built proxies: `POST /api/auth/{login,register,logout}`, `GET /api/users/me`, `GET|POST /api/listings`, `POST /api/listings/[id]/photos`, `GET /api/bookings`, `PATCH /api/bookings/[id]/{confirm,cancel}`, `GET /api/notifications`. Notably **there is no `/api/listings/[id]` proxy** even though listing-service already implements `GET`/`PATCH`/`DELETE` on it — so "Lihat Detail" and any edit/delete flow has a backend but no route to reach it. That is cheap to close.

---

## 3. Gap table

Phase column: **P1** = buildable against services that exist today. **P2** = needs payment/escrow. **P2 (svc)** = blocked on a different stub service, named inline.

### Section A — Autentikasi Pemilik (Web)

| Design screen | Built? | What's missing vs. design | Backend dependency | Phase |
|---|---|---|---|---|
| **A0 · Landing / Value Prop Pemilik** (1280×1400) | Not at all | Entire marketing landing page. Design has hero, "UNTUK PEMILIK KOST" eyebrow, value props, "Daftar Gratis Sekarang" CTA. No route exists. | None — static | P1 |
| **A1 · Selamat Datang Kembali (Login)** | Partially | Form works and is wired. Missing: **"Lanjut dengan Google" is a no-op** (`onClick` is an empty TODO) despite auth-service already implementing `POST /login/google`. **"Lupa kata sandi?" is `href="#"`** — a dead link. | `POST /auth/login/google` **exists**, unwired. Needs `/api/auth/login/google` proxy. | P1 |
| **A2 · Login dengan Google (modal)** | Not at all | Account-chooser modal. No component. | `POST /auth/login/google` exists | P1 |
| **A3 · Lengkapi Profil (Daftar 1/2)** | Partially | Built as step 1 of 3 in `/register`. Missing field: **"Jumlah Kamar Dikelola"**. Design is a standalone 960×640 artboard; built is a step in a merged flow. | None (client state) | P1 |
| **A4 · Buat Akun Baru (Daftar 2/2)** | Partially | Fields match. Missing: standalone-screen treatment; the design separates A3/A4 as distinct screens with their own chrome. | `POST /auth/register` exists | P1 |
| **A5 · Lupa Kata Sandi?** | Not at all | Email entry + "Kirim Kode Reset". No route, no component. | **MISSING: `POST /auth/password/forgot`.** auth-service has no password-reset route at all. | P1 |
| **A6 · Verifikasi Kode** | Not at all | OTP entry screen. No route. | `POST /auth/otp/request` + `/otp/verify` **exist** — likely reusable for the reset flow. | P1 |
| **A7 · Kata Sandi Baru** | Not at all | New-password + confirm screen. No route. | **MISSING: `POST /auth/password/reset`.** | P1 |
| **A8 · Verifikasi Kepemilikan (KTP + foto + selfie liveness)** | Partially | UI exists as register step 3 with all three doc rows. **But the "Unggah" buttons only flip a local boolean — no file picker, no upload, nothing is sent.** An owner can pass this gate having uploaded nothing. Code comments this honestly. | **MISSING: owner KYC upload + submit endpoint** (e.g. `POST /users/me/verification`). user-service has `POST /me/avatar` only. | P1 |
| **A9 · Verifikasi Sedang Ditinjau** | Not at all | Pending-review confirmation screen with "Siapkan Listing Pertama" CTA. Register redirects straight to `/` instead. | **MISSING: KYC status field/endpoint** to know the account is pending. | P1 |

### Section B — Dashboard Pemilik

| Design screen | Built? | What's missing vs. design | Backend dependency | Phase |
|---|---|---|---|---|
| **B1 · Dashboard Pemilik (Home)** (1280×1080) | Partially | Only the 4-KPI row exists, and **3 of the 4 KPIs render `—` / "Belum ada data"**. Missing entirely: (a) **Peta Hunian Kamar** — 10-col room grid, colour-coded terisi/kosong/maintenance, with legend counts; (b) **Analisis Pendapatan (6 Bulan Terakhir)** bar chart + period selector; (c) **Pendapatan Escrow Aktif** callout card; (d) **Aktivitas & Tugas Urgent** feed (design has 4 typed rows w/ colour dot + action link — built shows "Belum ada aktivitas"); (e) **Kualitas Profil Anda** conic-gradient completeness ring + "Lengkapi Profil" CTA. Design KPIs are Total Pendapatan / Kamar Terisi / Calon Penyewa Baru / Rating Rata-rata; built are Total Listing / Okupansi / Pendapatan / Penyewa Aktif — **the KPI set itself differs**. | Room map: **MISSING rooms API** (`GET /listings/:id/rooms`). Revenue chart + escrow: payment + escrow services. Rating: review-service (stub). Task feed: needs aggregation across booking/payment/KYC. Profile-quality ring: computable client-side from listing fields. | Mixed — profile ring + "Calon Penyewa Baru" KPI are **P1**; room map is **P1 once rooms API lands**; revenue/escrow/rating are **P2** |

### Section C — Manajemen Properti

| Design screen | Built? | What's missing vs. design | Backend dependency | Phase |
|---|---|---|---|---|
| **C1 · Properti Saya** (1280×1130) | Partially | **Wrong layout.** Design is a **card grid**, one rich card per property (photo, status badge e.g. "Hampir Terisi"/"Tersedia", and a per-property stat strip: Total Kamar / Terisi / Kosong / Okupansi / ID Kamar Kosong / Waitlist). Built is a **flat 5-column table** (Nama/Lokasi/Harga/Status/Aksi). Also missing: **"Status Keberadaan"** and **"Lokasi"** filter selects (built has only a search field, and **the search input is not wired to any state or query** — typing does nothing). "Lihat Detail" button has no `onClick` and no destination. | Occupancy stats: **MISSING rooms API**. Detail nav: listing-service `GET /:id` exists but **no `/api/listings/[id]` proxy**. | P1 (needs rooms API for the stat strip) |
| **C2 · Tambah Kost — 1. Informasi Dasar** | Partially | Fields present. Missing: **map picker** — design implies a location control; built exposes raw **Latitude/Longitude text inputs** with a hardcoded Malang fallback. Missing **Kelurahan** as its own field (built reuses `district` for both `kelurahan` and `kecamatan`). Missing the **LivePreviewPanel** side rail the design shows on wizard steps. | Maps API (Google/Mapbox) — configured but unused | P1 |
| **C3 · Tambah Kost — 2. Fasilitas & Kamar** (1280×**1940** — the tallest artboard) | Partially | Large gap. Missing: **"Tipe & Kapasitas Kamar"** 3-card selector (Kamar Eksklusif / Kamar Berbagi / Studio Mini); **"Kamar Mandi"** radio pair (Dalam/Luar) + Water Heater toggle; **"Tipe Hunian"** select. Built has only two checkbox groups (Fasilitas Kamar / Fasilitas Bersama) — and **"Jumlah Unit" and "Kapasitas" are rendered disabled with "Belum tersedia"**. | Room typing/count: **MISSING rooms API** — `Room` model exists in Prisma, unexposed. | P1 (needs rooms API) |
| **C4 · Tambah Kost — 3. Foto & Galeri** | Partially | Upload + main-photo + progress works. Missing vs. design: gallery/category organisation ("Foto & Galeri" implies grouped sets, not one flat list) and the **video-tour prompt** ("Tambahkan jam video tur kost" appears in the C1 design copy). | `POST /listings/:id/photos` exists (Cloudinary wired) | P1 |
| **C5 · Tambah Kost — 4. Harga & Aturan** (1280×1610) | Partially | **Step is misnamed and mostly missing.** Design step 4 is **"Harga & Aturan"**; built step 4 is **"Preview & Publish"**. Built collects only `Harga Sewa` (+ an unwired deposit toggle in state). Missing: **Durasi Pembayaran** select; **"🚪 Aturan Kost & Akses"** — 5 toggle rows (Akses 24 Jam, Boleh Bawa Tamu Menginap, Lawan Jenis Dilarang Masuk Kamar, Dilarang Bawa Hewan, Dilarang Merokok) + "Aturan Tambahan" textarea; **"➕ Biaya Tambahan"** — Biaya Penghuni Tambahan, Parkir Motor, Parkir Mobil. Also missing the **LivePreviewPanel**. Critically, **`mapFormToCreateListingInput` never sends `rules`, deposit, or extra fees** — `Listing.rules` exists in the type but is never populated. | listing-service `POST /` — **needs schema extension** for deposit, payment duration, rules[], and additional fees. | P1 |

### Section D — Calon Penyewa

| Design screen | Built? | What's missing vs. design | Backend dependency | Phase |
|---|---|---|---|---|
| **D1 · Daftar Calon Penyewa** | Partially | Card grid + filter pills + search exist. But the cards are **anonymous**: they render `Penyewa #<first 8 chars of studentId>`, `Listing #<id>`, `Kamar #<id>` — because booking-service returns raw IDs and nothing joins them. Design cards show **applicant name, role (Mahasiswa), university (UB), room name, match score, star rating, and a "✓ Identitas Terverifikasi" badge**. Missing filters: **"Properti"** and **"Urutkan"** selects. Filter pills differ: design is Semua/Perlu Ditinjau/**Disetujui**/**Ditolak**; built is Semua/Perlu Ditinjau/Dikonfirmasi/Dibatalkan. Search filters on `studentId` substring, which is not a thing a human can type. | **MISSING: applicant profile hydration.** Needs booking-service to embed student profile, or a batch `GET /users?ids=` lookup. Match score needs **ai-service** (no implementation). Listing/room names need the same join. | P1 for names/join; **match score is P2 (ai-service)** |
| **D2 · Screening Calon Penyewa** | Not at all | Full screening detail page: applicant profile, verified-identity block, score breakdown, rent history, and the **"✓ Terima Pengajuan" / "✕ Tolak Pengajuan" / "Chat dengan Calon Penyewa"** action set. No route. (Confirm/cancel mutations exist on the D1 cards, so the actions are half-there in the wrong place.) | Profile join (above); **chat CTA needs chat-service (stub)**; score needs ai-service | P1 for the page, **P2 for score + chat** |
| **D3 · Kriteria Penyewa (screening settings)** | Not at all | Owner-configurable screening preferences + "Simpan Kriteria". No route, no component. Note `H1` design also contains a "Skor Minimum Auto-Terima" field — these overlap. | **MISSING: owner screening-criteria persistence** (e.g. `GET|PUT /users/me/screening-criteria`) | P1 |

### Section E — Penyewa Aktif & Kontrak

| Design screen | Built? | What's missing vs. design | Backend dependency | Phase |
|---|---|---|---|---|
| **E1 · Penyewa Aktif** | Not at all | Entire screen. Filters Semua/Kontrak Aktif/Akan Berakhir/Menunggu Check-in; search; Properti + Urutkan selects; per-tenant rows w/ room, period, status, payment (Lunas), check-in state; "Lihat Kontrak →". No route, no sidebar entry. | booking-service `GET /?status=ACTIVE` exists but **payment status ("Lunas") needs payment-service**; room name needs rooms API | **P2** for payment column; shell is P1 |
| **E2 · Detail Kontrak Penyewa** | Not at all | Contract detail + actions: **Chat**, **Perpanjang Kontrak**, **Proses Check-Out**, **Generate Surat Domisili**. No route. | **MISSING: `PATCH /bookings/:id/extend`, `POST /bookings/:id/checkout`, domicile-letter generation.** Chat needs chat-service. Escrow release on checkout needs escrow-service. | **P2** |
| **E3 · Modal — Beri Rating Penyewa** | Not at all | Post-contract tenant rating modal ("Catatan (opsional, privat)", "Lewati", "Kirim Ulasan & Selesaikan Kontrak"). No component. | **review-service is a stub** — needs `POST /reviews` | **P2 (review-service)** |

### Section F — Pesan (Chat)

| Design screen | Built? | What's missing vs. design | Backend dependency | Phase |
|---|---|---|---|---|
| **F1 · Pesan / Inbox** | Not at all | Conversation list + chat window, unread badges, per-conversation context line ("Calon Penyewa · Kost Lavender A2"), "Screening →" jump. No route, no sidebar entry. | **chat-service is a stub** (health only). Needs MongoDB + Socket.io per CLAUDE.md. `ChatRoom`/`ChatMessage` models exist in Prisma. | **P2 (chat-service)** |

### Section G — Manajemen Keuangan

| Design screen | Built? | What's missing vs. design | Backend dependency | Phase |
|---|---|---|---|---|
| **G1 · Manajemen Keuangan** | Partially | **Shell only, deliberately.** Page exists with 3 KPI cards and a transaction table — all rendering "Belum ada data" / "Belum ada transaksi", and "Tarik Saldo" is `disabled`. This is the correct call (the file documents it), not a bug. Missing everything real: cash-flow chart (design has weekly pemasukan/pengeluaran bars), the +12% delta, the "2 Penyewa" arrears link. | **payment-service + escrow-service — both stubs.** | **P2** |
| **G2 · Daftar Tunggakan Sewa** | Not at all | Arrears list, "🔔 Kirim Pengingat ke Semua", per-row "Hubungi" / "Kirim Pengingat". No route. | payment-service (invoices/arrears) + notification-service (exists) | **P2** |
| **G3 · Riwayat Transaksi** | Not at all | Full transaction history + **"⬇ Unduh Laporan"** export. (The `/finance` page has a *stub* transaction table, but not this screen.) | payment-service | **P2** |
| **G4 · Modal — Tarik Saldo Properti** | Not at all | Withdrawal modal. No component. | **escrow-service** (withdrawable balance) + payment-service (disbursement) | **P2** |
| **G5 · Modal — Tambah Rekening Baru** | Not at all | Bank-account add modal. No component. | **MISSING: payout bank account CRUD** | **P2** |
| **G6 · Modal — Penarikan Berhasil Diajukan** | Not at all | Success confirmation modal. No component. | escrow/payment | **P2** |
| **G7 · Pengaturan Smart Rent** | Not at all | Auto-billing config: "Aktifkan auto-reminder", "Sertakan tautan pembayaran", "Kabari saya jika penyewa belum bayar", "Aktifkan late fee", "Simpan Pengaturan". No route. | **MISSING: smart-rent settings persistence**; late fee + payment link need payment-service | **P2** |
| **G8 · Jadwal Pengingat Otomatis** | Not at all | Reminder-schedule timeline view. No route. | notification-service exists (BullMQ) but **schedule config endpoint missing**; tied to G7 | **P2** |

### Section H — Pengaturan & Profil Pemilik

| Design screen | Built? | What's missing vs. design | Backend dependency | Phase |
|---|---|---|---|---|
| **H1 · Pengaturan & Profil Pemilik** | Not at all | Entire settings page. Design blocks: identity (Nama Lengkap Pemilik, WhatsApp Aktif, Email Pemberitahuan); **payout accounts** (with "Utama" primary badge); **security** (Kata Sandi Saat Ini / Baru / "Perbarui Kata Sandi"); **auto-tenant preferences** (Gender Penghuni, **Skor Minimum Auto-Terima**, Tipe Penyewa); **"Nonaktifkan Akun"**. No route, no sidebar entry — though `WTopBar` already renders a Settings icon in the profile dropdown. | Identity: `PATCH /users/me` **exists**. **MISSING: `POST /auth/password/change`** (see A5/A7), payout-account CRUD (**P2**), account-deactivate, auto-accept preferences (overlaps D3). | **Split** — identity block is **P1** today; password change is P1 + new endpoint; **payout accounts are P2** |

### Section I — Notifikasi

| Design screen | Built? | What's missing vs. design | Backend dependency | Phase |
|---|---|---|---|---|
| **I1 · Halaman Notifikasi** | Not at all | Full-page notification centre with filter pills Semua/Belum Dibaca/Booking/Pembayaran/Sistem, grouped by day, unread state, icon-per-type. **The bell in `WTopBar` renders a live unread count but links nowhere** — `useUnreadNotificationCount` is wired, the destination isn't built. This is the cheapest high-value screen on the list. | notification-service `GET /` and `PATCH /:id/read` **both exist**. Web proxy has `GET /api/notifications` but **no `PATCH /api/notifications/[id]/read` proxy**. | **P1** — closest to shippable of anything unbuilt |

### Section J — Maintenance & Property Log

| Design screen | Built? | What's missing vs. design | Backend dependency | Phase |
|---|---|---|---|---|
| **J1 · Inbox Maintenance** | Not at all | Request inbox: 4 KPIs (Permintaan Baru / Sedang Diproses / Selesai bulan ini / Respons rata-rata), urgency taxonomy (**Darurat / Segera / Tidak mendesak**), filter pills, "+ Catat Kondisi Kamar". No route, no sidebar entry. | **MISSING: maintenance domain entirely** — no model in Prisma, no service. Needs `MaintenanceRequest` model + CRUD. | **P2+ (new domain)** |
| **J2 · Detail Permintaan + Update Status** | Not at all | Request detail, "💬 Chat Penyewa", "Kirim Update ke Penyewa". | Same + chat-service | **P2+** |
| **J3 · Log Properti (timeline)** | Not at all | Per-room condition/repair timeline, "+ Catat Log Baru". | Same + rooms API | **P2+** |

### Section K — Analitik & Market Intelligence

| Design screen | Built? | What's missing vs. design | Backend dependency | Phase |
|---|---|---|---|---|
| **K1 · Analitik (occupancy + revenue)** | Not at all | KPIs Tingkat Hunian / Pendapatan Bulan Ini / Dilihat / Inquiry Masuk, period selector, charts. No route. | **MISSING: analytics aggregation.** Views/inquiry counts have no tracking anywhere. Revenue → payment-service. Occupancy → rooms API. | **P2** |
| **K2 · Conversion Funnel** | Not at all | View → inquiry → booking funnel. | **MISSING: event tracking** — nothing records listing views today | **P2** |
| **K3 · Market Intelligence** | Not at all | Price benchmarking vs. area, demand signals, seasonality, "🔵 Harga wajar" verdict. | **ai-service (only `main.py`)** + market data | **P2 (ai-service)** |

### Section L — Inquiry & FAQ Auto-Response

| Design screen | Built? | What's missing vs. design | Backend dependency | Phase |
|---|---|---|---|---|
| **L1 · Inbox Inquiry** | Not at all | Inquiry inbox, KPIs (Perlu Direspons / Dijawab Otomatis / Rata-rata Waktu Balas / Konversi ke Booking), reputation badges (Baru/Terpercaya), "✓ Dijawab otomatis oleh FAQ", Arsip/Balas. No route, no sidebar entry. | **MISSING: inquiry domain** — no model, no service. Overlaps chat-service. | **P2 (chat/new domain)** |
| **L2 · FAQ Auto-Response (setting)** | Not at all | FAQ rule CRUD + auto-reply toggles, "+ Tambah FAQ". | **MISSING: FAQ storage**; auto-answer needs ai-service | **P2 (ai-service)** |

### Section M — Empty & Transitional States

| Design screen | Built? | What's missing vs. design | Backend dependency | Phase |
|---|---|---|---|---|
| **M1 · Belum Ada Listing** | Partially | `/listings` has an inline empty state (text + "Tambah Kost Baru" button). Design M1 is a **full-card 460px-min centered block with icon, title, subtitle, and CTA**. Built version has no icon/illustration and different copy. | None | **P1** |
| **M2 · Listing Menunggu Verifikasi** | Not at all | Pending-verification card w/ "⏳ Menunggu Verifikasi" badge + "Pratinjau". `ListingStatus.PENDING_REVIEW` **already exists and the listings table already maps it to a badge** — but the dedicated state screen doesn't. | listing-service already has the status | **P1** |
| **M3 · Maintenance Kosong** | Not at all | Empty state for J1. Blocked on J1 existing. | Maintenance domain | **P2+** |

---

## 4. Cross-cutting gaps (not screens, but they block screens)

| # | Gap | Impact | Phase |
|---|---|---|---|
| X1 | **Sidebar is missing 6 of 10 nav items** — `Penyewa Aktif`, `Pesan`, `Pengaturan`, `Perawatan`, `Analitik`, `Inquiry`. | Even once E/F/H/J/K/L exist they're unreachable. Add each entry as its route lands. | P1, incremental |
| X2 | **No rooms API.** `Room` model is in Prisma; no service exposes it. | Blocks B1 room map, C1 occupancy stats, C3 room typing, E1/E2 room names, J3 per-room log. **Highest-leverage single backend task.** | P1 |
| X3 | **No `/api/listings/[id]` proxy** despite `GET`/`PATCH`/`DELETE` existing in listing-service. | Blocks listing detail, edit, delete, "Lihat Detail". Cheapest backend win in the document. | P1 |
| X4 | **No user-profile hydration on bookings.** | Forces D1's `Penyewa #a1b2c3d4` placeholders; blocks D1, D2, E1. | P1 |
| X5 | **No password-reset endpoints** (`forgot`/`reset`/`change`). | Blocks A5, A7, and H1's security block. | P1 |
| X6 | **`LivePreviewPanel` not built.** Design shows it on wizard steps C2–C5 as a live listing preview w/ completeness %. | Wizard feels blind vs. design. | P1 |
| X7 | **Google OAuth wired backend, dead frontend.** `POST /auth/login/google` exists; the button's `onClick` is an empty TODO. | A1, A2. | P1 |
| X8 | **No listing-view event tracking anywhere.** | Makes K1/K2 unbuildable regardless of payment-service. | P2 |

---

## 5. Consolidated list of missing backend endpoints

Named, as requested. **Bold** = blocks a Phase 1 screen.

**Phase 1 (services that already exist, need new routes):**
1. **`GET /listings/:id/rooms`, `POST`, `PATCH /rooms/:id`** — listing-service (X2)
2. **`/api/listings/[id]` Next proxy** — `GET`/`PATCH`/`DELETE` (X3)
3. **`POST /auth/password/forgot`** (A5)
4. **`POST /auth/password/reset`** (A7)
5. **`POST /auth/password/change`** (H1)
6. **`POST /users/me/verification`** — owner KYC docs (A8), + status field for A9
7. **`GET|PUT /users/me/screening-criteria`** (D3, H1)
8. **Booking list with embedded student profile**, or `GET /users?ids=` (D1, D2, E1)
9. **`/api/auth/login/google` proxy** (A1, A2)
10. **`PATCH /api/notifications/[id]/read` proxy** (I1)
11. **listing `POST /` schema extension** — `rules[]`, deposit, payment duration, additional fees (C5)

**Phase 2 (services that do not exist yet):**
12. payment-service: revenue summary, transactions, invoices/arrears, report export (G1–G3, B1, K1)
13. escrow-service: held/withdrawable balance, withdrawal request (B1, G1, G4, G6) — *100% test coverage required per CLAUDE.md*
14. payout bank account CRUD (G5, H1)
15. smart-rent settings + reminder schedule (G7, G8)
16. review-service `POST /reviews` (E3, B1 rating KPI)
17. chat-service: rooms, messages, Socket.io (F1, D2, E2, J2)
18. `PATCH /bookings/:id/extend`, `POST /bookings/:id/checkout`, domicile letter (E2)
19. maintenance domain — new model + service (J1–J3, M3)
20. inquiry + FAQ domain (L1, L2)
21. analytics aggregation + view tracking (K1, K2)
22. ai-service: match scoring (D1, D2), market intel (K3), FAQ auto-answer (L2)

---

## 6. Suggested working order

Not a plan to execute — just the dependency-sensible sequence, cheapest-first within each tier.

**Tier 1 — no new backend at all:**
`I1` (bell already counts, endpoints exist) → `M1`/`M2` (pure UI) → `A0` (static) → `A1`+`A2` Google wiring (endpoint exists) → `H1` identity block only (`PATCH /users/me` exists) → `C5` rules/fees UI (needs only schema extension).

**Tier 2 — small new endpoints on existing services:**
`X3` listing detail proxy → `A5`/`A6`/`A7` password reset → `A8`/`A9` KYC → `D3` criteria → `X4` profile hydration, which then unblocks `D1` properly and `D2`.

**Tier 3 — rooms API, then everything it unlocks:**
`X2` → `C1` stat strips → `C3` room typing → `B1` room map → `E1` shell.

**Tier 4 — Phase 2 proper:** payment + escrow first (unblocks all of G and most of B1), then review → chat → maintenance → inquiry → analytics/AI.

---

## 7. Honest caveats

- **"Partially" spans a wide range here.** `G1` is a deliberate empty shell awaiting Phase 2; `C1` is a working page with the wrong layout; `A8` is a UI that silently discards user input. They are not comparable amounts of work — read the middle column, not the verdict.
- **This covers the owner design only.** `KostIn Web Penyewa - Standalone.html` (renter) was listed as a source but is a separate surface with its own artboard set, and nothing in `apps/web/src` currently targets it — the entire renter web app is unbuilt. It needs its own pass; I did not enumerate it here because you asked for the owner gap list, and mixing the two would double the table without clarifying either.
- **Pixel-level fidelity is not assessed.** I compared structure, fields, components, and data sources by reading both sources. I did not render the design bundle in a browser and diff it visually against the running app, so spacing, exact type scale, and colour-token drift on the 13 partial screens are unverified. `DESIGN_SYSTEM.md` and the extracted `11_f5bf4da2.js` token module would be the basis for that check.
- **Artboard heights are a rough proxy for content volume**, and I used them as a signal (e.g. C3 at 1940px, C5 at 1610px are large screens). They are not a work estimate.
