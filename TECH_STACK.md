# 🏠 KostIn — Tech Stack Guide

> Dokumen ini dibuat agar kamu bisa **memahami sistemnya secara nyata**, 
> Setiap teknologi dijelaskan: apa itu, kenapa dipilih, dan dipakai untuk apa di proyek ini.

---

## 📋 Daftar Isi

1. [Monorepo & Build System](#1-monorepo--build-system)
2. [Containerization — Docker](#2-containerization--docker)
3. [Backend Services — Node.js & TypeScript](#3-backend-services--nodejs--typescript)
4. [AI Service — Python](#4-ai-service--python)
5. [Frontend & Mobile](#5-frontend--mobile)
6. [Database — PostgreSQL](#6-database--postgresql)
7. [Database — MongoDB](#7-database--mongodb)
8. [Cache & Queue — Redis](#8-cache--queue--redis)
9. [ORM — Prisma](#9-orm--prisma)
10. [Authentication & Keamanan](#10-authentication--keamanan)
11. [Payment — Midtrans](#11-payment--midtrans)
12. [Media & CDN — Cloudinary](#12-media--cdn--cloudinary)
13. [Maps & Geolokasi](#13-maps--geolokasi)
14. [Notifikasi — Firebase FCM & WhatsApp](#14-notifikasi--firebase-fcm--whatsapp)
15. [Search — Elasticsearch](#15-search--elasticsearch)
16. [AI/LLM — OpenAI](#16-aillm--openai)
17. [Shared Packages](#17-shared-packages)
18. [Pola Arsitektur: Microservices](#18-pola-arsitektur-microservices)

---

## 1. Monorepo & Build System

### Apa itu Monorepo?
Monorepo adalah satu repository Git yang menyimpan **banyak project sekaligus** — frontend, mobile, dan semua backend services — dalam satu tempat. Kebalikannya adalah polyrepo (satu repo per project).

**Kenapa Kostin pakai monorepo?**
- Satu `git clone` → semua code tersedia
- Shared packages (types, config, database) bisa dipakai semua service tanpa duplikasi
- Perubahan di satu package langsung terdeteksi oleh semua yang bergantung padanya

### Turborepo
```
Tool: turbo (turbo.json)
Versi: ^2.0.0
```
Turborepo adalah **build orchestrator** khusus untuk monorepo JavaScript/TypeScript. Tugasnya:

- **Caching cerdas**: Kalau kamu `npm run build` dan tidak ada file yang berubah, Turborepo akan skip build dan pakai hasil cache sebelumnya. Build yang harusnya 3 menit bisa jadi 3 detik.
- **Parallel execution**: Semua service yang tidak saling bergantung di-build secara paralel sekaligus.
- **Task graph**: Turborepo tahu urutan yang benar — misalnya `packages/database` harus di-build dulu sebelum service lain, karena service lain bergantung padanya.

```
Struktur folder:
kostin/
├── apps/          → Frontend & Mobile (consumers)
├── services/      → Backend microservices
└── packages/      → Shared code (dependencies)
```

### npm Workspaces
Fitur bawaan npm yang membuat semua package di `apps/`, `services/`, dan `packages/` bisa saling mengimport satu sama lain seolah-olah sudah di-publish ke npm registry. Cukup satu `npm install` di root untuk menginstall dependency semua package.

---

## 2. Containerization — Docker

### Apa itu Docker?
Docker adalah teknologi yang mem-package sebuah aplikasi beserta **seluruh dependency-nya** ke dalam satu unit yang disebut **container**. Container berjalan secara terisolasi dari sistem operasi host.

**Analogi**: Bayangkan aplikasimu seperti makanan. Docker adalah kotak makan siang — semua bahan (runtime, library, config) ada di dalamnya. Kamu bisa pindahkan kotak itu ke laptop siapapun dan makanannya tetap sama.

### Docker Image vs Container
| Konsep | Penjelasan |
|--------|-----------|
| **Dockerfile** | Resep — instruksi untuk membuat image |
| **Image** | Snapshot yang sudah jadi, bisa didistribusikan |
| **Container** | Image yang sedang berjalan (proses aktif) |

### Docker Compose
```
File: docker-compose.yml
```
Docker Compose adalah tool untuk menjalankan **banyak container sekaligus** dengan satu perintah. Di Kostin, satu file `docker-compose.yml` mendefinisikan:

- 3 database (PostgreSQL, Redis, MongoDB)
- 12 backend services
- Semua network dan volume

```bash
# Jalankan database saja
docker compose up -d

# Jalankan database + semua services
docker compose --profile services up -d

# Stop semua
docker compose down
```

### Docker Networks
```yaml
networks:
  kostin_net:
    driver: bridge
```
Semua container Kostin terhubung ke network bernama `kostin_net`. Ini berarti:
- Container bisa saling berkomunikasi menggunakan **nama service** sebagai hostname (bukan IP)
- Contoh: service `booking` bisa hit service `escrow` via `http://escrow:3005`
- Dari luar Docker, hanya port yang di-expose yang bisa diakses

### Docker Volumes
```yaml
volumes:
  postgres_data:
  redis_data:
  mongo_data:
```
Volume adalah tempat penyimpanan **persisten** untuk container. Data database tidak akan hilang saat container di-restart karena disimpan di volume, bukan di dalam container itu sendiri.

### Docker Profiles
Kostin menggunakan fitur `profiles` di Docker Compose:
- **Tanpa profile** → hanya infra (PostgreSQL, Redis, MongoDB) yang jalan
- **`--profile services`** → infra + semua backend services jalan

Ini berguna saat development: kamu bisa jalankan database via Docker, tapi jalankan service-nya langsung di host (lebih cepat untuk hot-reload).

---

## 3. Backend Services — Node.js & TypeScript

### Node.js
```
Versi minimum: >= 20.0.0
```
Node.js adalah **JavaScript runtime** yang memungkinkan JavaScript dijalankan di server (bukan cuma di browser). Node.js unggul untuk workload **I/O-heavy** (banyak operasi baca/tulis ke database, request HTTP keluar) karena arsitekturnya yang non-blocking dan event-driven.

**Kenapa bukan PHP atau Python untuk backend utama?**
- Satu bahasa (TypeScript) dari frontend hingga backend → developer tidak perlu context switch
- npm ecosystem sangat kaya untuk use case startup
- Performa tinggi untuk API server

### TypeScript
TypeScript adalah JavaScript dengan **sistem tipe statis**. Artinya, kamu mendeklarasikan tipe data secara eksplisit dan compiler akan menangkap error sebelum kode dijalankan.

```typescript
// JavaScript biasa — error baru ketahuan saat runtime
function hitungHarga(harga, diskon) {
  return harga - diskon;
}

// TypeScript — error ketahuan saat nulis kode
function hitungHarga(harga: number, diskon: number): number {
  return harga - diskon;
}
```

**Manfaat di proyek Kostin:**
- Shared types di `packages/types` memastikan struktur data konsisten di semua service
- Refactoring lebih aman — compiler akan komplain kalau ada yang terlewat
- IDE auto-complete yang jauh lebih akurat

### Express.js / Fastify (per service)
Framework HTTP untuk membuat REST API. Setiap service punya server-nya sendiri dengan port yang berbeda:

| Service | Port | Tanggung Jawab |
|---------|------|----------------|
| auth | 3001 | Login, register, JWT, OTP |
| user | 3002 | Profil pengguna, upload foto |
| listing | 3003 | Data kost, pencarian, filter |
| booking | 3004 | Pemesanan kost |
| escrow | 3005 | Penampungan uang sementara |
| payment | 3006 | Integrasi payment gateway |
| chat | 3007 | Pesan real-time antar user |
| notification | 3008 | Push notif & WhatsApp |
| review | 3009 | Rating & ulasan |
| community | 3010 | Forum/komunitas penghuni |
| admin | 3011 | Dashboard admin |

---

## 4. AI Service — Python

```
Port: 8000
```

### Kenapa Python untuk AI?
Ekosistem AI/ML di Python jauh lebih mature dibanding Node.js. Library seperti `scikit-learn`, `pandas`, `numpy`, dan integrasi langsung dengan OpenAI API semuanya tersedia di Python.

Service ini kemungkinan menggunakan **FastAPI** atau **Flask** sebagai HTTP framework-nya.

### Fungsi AI Service di Kostin
- **Rekomendasi kost** berdasarkan preferensi pengguna (harga, lokasi, fasilitas)
- **AI matching** antara pencari kost dan listing yang tersedia
- Berkomunikasi dengan **OpenAI GPT-4o** untuk fitur natural language (misalnya: "cari kost dekat kampus UI di bawah 1 juta")

---

## 5. Frontend & Mobile

### apps/web — Next.js (React)
```
Framework: Next.js 14.2.3 (App Router)
UI: React 18.3
Bahasa: TypeScript (strict mode)
Package: @kostin/web
```
Next.js adalah framework React dengan fitur tambahan seperti:
- **Server-Side Rendering (SSR)**: HTML di-render di server → lebih cepat dan SEO-friendly
- **Static Site Generation (SSG)**: Halaman yang jarang berubah di-generate sekali (cocok untuk landing page)
- **File-based routing**: Struktur folder = URL path (`app/page.tsx`, `app/layout.tsx`)
- **API Routes**: Bisa buat endpoint API langsung di project Next.js (berguna untuk BFF — Backend for Frontend)

Saat ini pakai App Router (bukan Pages Router lama), dan sudah terhubung ke `@kostin/types` untuk shared types serta `@kostin/config` untuk ESLint/TS config. Image domain `res.cloudinary.com` sudah di-whitelist di `next.config.js` untuk foto kost dari Cloudinary.

**Belum dipilih (Phase 0, masih kosong):**
- Styling — belum ada Tailwind CSS / CSS Modules / styled-components terpasang
- State management — belum ada Zustand / Redux / Jotai
- Data fetching — belum ada React Query (TanStack Query) / SWR untuk komunikasi ke backend services
- UI component library — belum ada shadcn/ui, Radix, dsb.

### apps/mobile — React Native (Expo)
```
Framework: Expo SDK 51 + Expo Router 3.5
UI: React Native 0.74, React 18.2
Bahasa: TypeScript
Package: @kostin/mobile
```
React Native memungkinkan kamu menulis aplikasi mobile (Android & iOS) menggunakan **JavaScript/TypeScript**. Satu codebase untuk dua platform. Berbeda dengan WebView app — React Native menghasilkan komponen UI native yang sesungguhnya.

**Kenapa Expo, bukan React Native CLI murni?**
- Expo Router: file-based routing ala Next.js, tapi untuk mobile — konsisten dengan pola routing di `apps/web`
- Managed workflow: build APK/IPA tanpa perlu setup Xcode/Android Studio native project secara manual (via EAS Build)
- Akses cepat ke native API (kamera, lokasi, push notification) lewat `expo-*` packages tanpa native linking manual

Konfigurasi di `app.json`: bundle identifier `id.kostin.app`, scheme `kostin` (untuk deep linking), dan dukungan platform iOS, Android, serta web (fallback via `expo start --web`).

**Belum dipilih (Phase 0, masih kosong):**
- Styling — belum ada NativeWind / Tamagui / styled-components
- State management & data fetching — sama seperti web, belum ada
- Push notification client (Firebase FCM) belum diintegrasikan di sisi mobile

---

## 6. Database — PostgreSQL

```
Image: postgres:16-alpine
Port: 5432
Volume: postgres_data
Digunakan oleh: auth, user, listing, booking, escrow, payment, review, admin, ai
```

### Apa itu PostgreSQL?
PostgreSQL (sering disebut "Postgres") adalah **relational database** open-source yang sangat powerful. Data disimpan dalam tabel dengan baris dan kolom, dan antar tabel bisa dihubungkan melalui **relasi** (foreign key).

### Kenapa Relational Database?
Data di Kostin sebagian besar bersifat **terstruktur dan saling berkaitan**:
- User → punya banyak Booking
- Listing → dimiliki oleh User, punya banyak Review
- Booking → terhubung ke Escrow → terhubung ke Payment

Relasi ini paling natural dimodelkan di database relasional.

### Konsep Penting
| Konsep | Penjelasan |
|--------|-----------|
| **Schema** | Definisi struktur tabel (kolom, tipe data) |
| **Primary Key** | ID unik setiap baris |
| **Foreign Key** | Kolom yang merujuk ke Primary Key tabel lain |
| **Transaction** | Sekelompok operasi yang harus berhasil semua atau gagal semua (penting untuk escrow/payment) |
| **Index** | Struktur tambahan agar query lebih cepat |
| **Migration** | Script perubahan skema database yang diversion control |

### ACID Properties
PostgreSQL menjamin properti ACID yang krusial untuk data finansial:
- **A**tomicity — Semua operasi dalam satu transaksi berhasil atau semuanya dibatalkan
- **C**onsistency — Database selalu dalam state yang valid
- **I**solation — Transaksi yang berjalan paralel tidak saling ganggu
- **D**urability — Data yang sudah di-commit tidak akan hilang meski server crash

---

## 7. Database — MongoDB

```
Image: mongo:7
Port: 27017
Volume: mongo_data
Digunakan oleh: chat, community
```

### Apa itu MongoDB?
MongoDB adalah **document database** — data tidak disimpan dalam tabel, melainkan dalam **dokumen JSON** (format BSON secara internal). Dokumen yang berbeda dalam satu koleksi bisa punya struktur yang berbeda.

### Kenapa MongoDB untuk Chat & Community?
- **Pesan chat** sangat cocok disimpan sebagai dokumen: satu dokumen bisa menyimpan pesan, metadata, attachment, reaction — semua dalam satu unit
- **Schema fleksibel**: Struktur post di komunitas bisa berkembang tanpa harus mengubah skema database
- **Volume tinggi**: MongoDB sangat efisien untuk workload baca/tulis data yang banyak dan cepat

### Perbedaan PostgreSQL vs MongoDB
| Aspek | PostgreSQL | MongoDB |
|-------|-----------|---------|
| Model | Tabel & baris | Dokumen JSON |
| Schema | Rigid (harus didefinisikan) | Fleksibel |
| Relasi | Strong (JOIN) | Embedded / reference |
| Transaksi | Sangat mature (ACID) | Mendukung, tapi lebih jarang dipakai |
| Use case di Kostin | Data bisnis (user, booking, payment) | Chat, community posts |

---

## 8. Cache & Queue — Redis

```
Image: redis:7-alpine
Port: 6379
Volume: redis_data
Digunakan oleh: hampir semua service
```

### Apa itu Redis?
Redis adalah **in-memory data store** — data disimpan di RAM, bukan di disk. Ini membuatnya sangat cepat (sub-millisecond response time). Redis bisa digunakan sebagai:

### 1. Cache
Menyimpan hasil query yang sering diminta agar tidak perlu hit database terus-menerus.
```
User request → Redis hit? → Kembalikan data (cepat!)
                         → Cache miss → Hit PostgreSQL → Simpan ke Redis → Kembalikan data
```

### 2. Session Store
JWT Refresh Token atau data sesi disimpan di Redis. Saat user logout, token langsung dihapus dari Redis — lebih aman dibanding token stateless murni.

### 3. Message Queue — BullMQ
BullMQ adalah library antrian (queue) yang berjalan di atas Redis. Digunakan untuk **background jobs** — pekerjaan yang tidak perlu diselesaikan sebelum HTTP response dikirimkan ke user:

- Kirim notifikasi email/WhatsApp → masuk queue → worker proses di background
- Generate laporan → masuk queue → worker proses secara async
- Retry otomatis jika job gagal

**Analogi**: Kamu pesan makanan online → pesananmu masuk ke antrian dapur → dapur proses satu per satu → kamu tidak perlu nunggu di depan kasir.

### 4. Pub/Sub
Redis Pub/Sub digunakan untuk komunikasi real-time antar service, khususnya untuk update yang perlu disebarkan ke banyak penerima (misalnya notifikasi booking status berubah).

---

## 9. ORM — Prisma

```
Package: packages/database
```

### Apa itu ORM?
ORM (Object-Relational Mapper) adalah layer yang menerjemahkan **objek di kode program** menjadi **query SQL** dan sebaliknya. Kamu tidak perlu menulis SQL secara manual.

### Kenapa Prisma?
Prisma adalah ORM modern untuk TypeScript dengan keunggulan:
- **Type-safe queries**: Autocomplete dan type checking untuk setiap query database
- **Prisma Schema**: Satu file definisi skema yang menjadi sumber kebenaran (source of truth)
- **Migrations**: Prisma generate migration SQL secara otomatis dari perubahan schema
- **Prisma Client**: Auto-generated client yang selalu sinkron dengan schema terbaru

```prisma
// Schema Prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  listings  Listing[]
  createdAt DateTime @default(now())
}

model Listing {
  id      String @id @default(cuid())
  title   String
  price   Int
  owner   User   @relation(fields: [ownerId], references: [id])
  ownerId String
}
```

```typescript
// Query Prisma — TypeScript, bukan SQL mentah
const listings = await prisma.listing.findMany({
  where: { price: { lte: 1000000 } },
  include: { owner: true },
  orderBy: { price: 'asc' }
});
// listings sudah punya tipe Listing[] yang akurat
```

---

## 10. Authentication & Keamanan

### JWT (JSON Web Token)
JWT adalah standar untuk membuat **token yang bisa diverifikasi tanpa harus hit database** di setiap request.

Sebuah JWT terdiri dari 3 bagian (dipisah titik):
```
header.payload.signature
```
- **Header**: Algoritma yang digunakan (misalnya HS256)
- **Payload**: Data yang disimpan (user ID, role, expiry) — **bukan untuk data sensitif!**
- **Signature**: Hash dari header + payload menggunakan secret key — mencegah pemalsuan

**Alur di Kostin:**
1. User login dengan email/password
2. Server verifikasi credentials
3. Server buat **Access Token** (expiry 7 hari) + **Refresh Token** (expiry 30 hari)
4. Refresh Token disimpan di Redis (bisa di-revoke saat logout)
5. Setiap request berikutnya, client kirim Access Token di header Authorization
6. Saat Access Token expired, client pakai Refresh Token untuk dapat Access Token baru

### OTP via WhatsApp (Twilio / ZenziVa)
Untuk verifikasi nomor HP saat registrasi atau login mencurigakan, Kostin menggunakan OTP (One-Time Password) yang dikirim via WhatsApp.

- **Twilio**: Platform komunikasi global (SMS, WhatsApp, Voice)
- **ZenziVa**: Alternatif lokal untuk Indonesia, lebih murah untuk traffic WhatsApp tinggi

---

## 11. Payment — Midtrans

```
Service: payment (port 3006)
Env: MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY
```

### Apa itu Midtrans?
Midtrans adalah **payment gateway** terbesar di Indonesia, milik Gojek. Midtrans menjadi jembatan antara aplikasi Kostin dengan berbagai metode pembayaran:

- Transfer bank (BCA, BNI, Mandiri, BRI)
- Virtual Account
- QRIS
- GoPay, OVO, Dana
- Kartu kredit/debit

### Alur Pembayaran di Kostin
```
User checkout → booking-service → escrow-service → payment-service
             → Midtrans buat transaksi → Payment page/QRIS
             → User bayar → Midtrans webhook → payment-service
             → Update status → notification-service → notif ke user & pemilik kost
```

### Escrow Layer
Kostin memiliki `escrow-service` yang terpisah dari `payment-service`. Ini penting karena:
- Uang pembayaran **tidak langsung masuk ke pemilik kost**
- Uang ditahan di escrow hingga penyewa check-in dan tidak ada komplain
- Melindungi kedua pihak dari penipuan

---

## 12. Media & CDN — Cloudinary

```
Service: user (avatar), listing (foto kost)
Env: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
```

### Apa itu Cloudinary?
Cloudinary adalah layanan cloud untuk **upload, storage, transformasi, dan delivery** gambar/video.

**Kenapa tidak simpan gambar di server sendiri?**
- Storage server mahal dan tidak scalable
- Delivery lambat jika server hanya di satu lokasi
- Transformasi gambar (resize, crop, compress) butuh CPU besar

**Cloudinary menawarkan:**
- CDN global → gambar di-serve dari server terdekat dengan user
- Auto-resize & compress → hemat bandwidth mobile
- Format modern (WebP, AVIF) otomatis → lebih kecil, lebih cepat
- URL-based transformasi: `image.jpg?w=400&h=300&c=fill` → auto crop

---

## 13. Maps & Geolokasi

```
Service: listing (port 3003)
Env: GOOGLE_MAPS_API_KEY, MAPBOX_ACCESS_TOKEN
```

### Google Maps Platform
Digunakan untuk:
- **Geocoding**: Konversi alamat teks → koordinat lat/long
- **Reverse Geocoding**: Koordinat → alamat terbaca manusia
- **Places API**: Cari tempat di sekitar kost (kampus, minimarket, halte)
- **Distance Matrix**: Hitung jarak & waktu tempuh dari kost ke destinasi tertentu

### Mapbox
Alternatif Google Maps yang lebih fleksibel untuk kustomisasi tampilan peta di frontend. Mapbox lebih populer di aplikasi yang needs custom map styling.

---

## 14. Notifikasi — Firebase FCM & WhatsApp

```
Service: notification (port 3008)
```

### Firebase Cloud Messaging (FCM)
FCM adalah layanan Google untuk **push notification** ke perangkat Android dan iOS. Notifikasi muncul di lock screen / notification bar walaupun aplikasi sedang tidak dibuka.

**Alur**: Backend → FCM Server → Device

### ZenziVa (WhatsApp Notifications)
WhatsApp memiliki open rate yang jauh lebih tinggi dari push notification di Indonesia. ZenziVa digunakan sebagai fallback atau notifikasi utama untuk:
- Konfirmasi booking
- Pengingat pembayaran
- Update status escrow

---

## 15. Search — Elasticsearch

```
Env: ELASTICSEARCH_URL (Phase 2+)
Service: listing
```

### Apa itu Elasticsearch?
Elasticsearch adalah **search engine** berbasis Lucene yang dirancang untuk **full-text search** yang cepat dan relevan. Berbeda dengan `LIKE '%query%'` di PostgreSQL yang lambat dan tidak cerdas.

**Keunggulan Elasticsearch:**
- **Relevance scoring**: Hasil diurutkan berdasarkan seberapa relevan dengan query
- **Fuzzy search**: Toleran terhadap typo ("Margon" → "Margonda")
- **Filters**: Kombinasi full-text + filter (harga, lokasi, fasilitas) secara efisien
- **Aggregations**: "Berapa listing per rentang harga?" dalam satu query

**Di Kostin**: Pencarian kost berdasarkan nama, deskripsi, lokasi, dan fasilitas yang direncanakan di Phase 2+.

---

## 16. AI/LLM — OpenAI

```
Service: ai (port 8000)
Env: OPENAI_API_KEY, OPENAI_MODEL=gpt-4o
```

### GPT-4o
GPT-4o adalah Large Language Model (LLM) terbaru dari OpenAI. Di Kostin, digunakan untuk:

- **Natural language search**: User bisa cari kost dengan bahasa natural — "kost murah dekat UI untuk cewek dengan AC dan WiFi"
- **AI matching**: Sistem rekomendasikan kost terbaik berdasarkan riwayat dan preferensi user
- **Smart description**: Membantu pemilik kost generate deskripsi listing yang menarik

### Cara Kerja (Simplified)
```
User input → AI Service → Prompt engineering → OpenAI API
           → GPT-4o proses → Structured response
           → AI Service parse → Query ke database → Hasil rekomendasi
```

---

## 17. Shared Packages

```
Lokasi: packages/
```

### packages/database
Berisi **Prisma schema dan generated client** yang dibagikan ke semua service yang butuh akses PostgreSQL. Ini memastikan tidak ada duplikasi definisi tabel di setiap service.

### packages/types
Berisi **TypeScript type definitions** yang digunakan di semua service dan frontend. Contoh: type `User`, `Listing`, `Booking` didefinisikan sekali tapi dipakai di mana-mana.

**Manfaat**: Kalau struktur `Booking` berubah, perubahan langsung terdeteksi error di semua tempat yang menggunakannya — tidak ada yang kelewatan.

### packages/config
Berisi konfigurasi shared seperti:
- ESLint rules → coding standard konsisten di seluruh codebase
- TypeScript `tsconfig.json` base → setting kompilasi yang sama

---

## 18. Pola Arsitektur: Microservices

### Apa itu Microservices?
Microservices adalah pola arsitektur di mana sebuah aplikasi dipecah menjadi **service-service kecil yang independen**, masing-masing punya tanggung jawab spesifik dan bisa di-deploy secara mandiri.

**Kebalikannya**: Monolith — semua fitur dalam satu codebase dan satu proses.

### Trade-off yang Perlu Kamu Tahu

| Aspek | Microservices (Kostin) | Monolith |
|-------|----------------------|---------|
| **Deployment** | Tiap service bisa di-deploy sendiri | Deploy satu unit besar |
| **Skalabilitas** | Scale hanya service yang butuh (misal: listing) | Harus scale semua |
| **Isolasi failure** | Satu service down → yang lain tetap jalan | Satu error bisa crash semua |
| **Kompleksitas** | Tinggi — perlu manage network, service discovery | Rendah |
| **Development speed** | Awal lebih lambat, tapi scalable | Awal cepat |
| **Debugging** | Lebih sulit (trace across services) | Lebih mudah |

### Service-to-Service Communication di Kostin
Antar service di Kostin berkomunikasi via **HTTP REST** secara internal (dalam Docker network `kostin_net`):

```
booking-service (3004) → HTTP POST → escrow-service (3005)
escrow-service (3005)  → HTTP POST → payment-service (3006)
```

Environment variable `ESCROW_SERVICE_URL=http://escrow:3005` membuktikan ini — `escrow` adalah hostname Docker container, bukan domain publik.

---

## 🗺️ Diagram Alir Lengkap

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTS                            │
│   [Mobile App]              [Web App]                   │
│   React Native              Next.js                     │
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
           ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│              DOCKER NETWORK: kostin_net                  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │          APPLICATION SERVICES                   │    │
│  │                                                 │    │
│  │  auth:3001  user:3002  listing:3003             │    │
│  │  booking:3004  escrow:3005  payment:3006        │    │
│  │  chat:3007  notif:3008  review:3009             │    │
│  │  community:3010  admin:3011  ai:8000            │    │
│  └──────┬───────────┬────────────┬─────────────────┘    │
│         │           │            │                       │
│         ▼           ▼            ▼                       │
│  ┌────────────┐ ┌───────┐ ┌──────────┐                  │
│  │ PostgreSQL │ │ Redis │ │ MongoDB  │                  │
│  │  :5432     │ │ :6379 │ │ :27017   │                  │
│  └────────────┘ └───────┘ └──────────┘                  │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│                 EXTERNAL SERVICES                        │
│                                                         │
│  Twilio/ZenziVa   Cloudinary   Google Maps   Mapbox     │
│  Firebase FCM     Midtrans     Elasticsearch  OpenAI    │
└─────────────────────────────────────────────────────────┘
```

---

> 💡 **Tips belajar**: Jangan coba pahami semua sekaligus. Mulai dari satu fitur end-to-end, misalnya alur booking — dari user tap "Pesan" di mobile sampai uang masuk ke escrow. Trace code-nya dari `apps/mobile` → `services/booking` → `services/escrow` → `services/payment`. Begitu kamu paham satu alur, yang lain akan lebih mudah.
