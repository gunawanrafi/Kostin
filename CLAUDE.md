# KostIn

Platform cari kost berbasis AI untuk mahasiswa di Malang, Indonesia.

## Architecture Overview

Microservices, containerized with Docker, deploy to Vercel first then VPS.

## Services & Ports

| Service | Stack | Port | Dependencies |
|---|---|---|---|
| API Gateway | Nginx/Kong | 80/443 | — |
| auth-service | Node.js + Fastify | 3001 | PostgreSQL, Redis, Twilio |
| user-service | Node.js + Fastify | 3002 | PostgreSQL, Redis, Cloudinary |
| listing-service | Node.js + Fastify | 3003 | PostgreSQL, Elasticsearch, Cloudinary, Maps |
| booking-service | Node.js + Fastify | 3004 | PostgreSQL, Escrow Service |
| escrow-service | Node.js + Fastify | 3005 | PostgreSQL, Payment Service |
| payment-service | Node.js + Fastify | 3006 | PostgreSQL, Midtrans |
| chat-service | Node.js + Fastify | 3007 | MongoDB, Redis (Socket.io) |
| notification-service | Node.js + Fastify | 3008 | BullMQ Queue |
| review-service | Node.js + Fastify | 3009 | PostgreSQL |
| community-service | Node.js + Fastify | 3010 | MongoDB |
| admin-service | Node.js + Fastify | 3011 | PostgreSQL, Redis |
| ai-service | Python + FastAPI | 8000 | OpenAI API, PostgreSQL, Redis |

> **CRITICAL:** escrow-service requires 100% test coverage. Never skip or bypass escrow logic tests.

## Data Layer

- **PostgreSQL** — users, listings, bookings, payments, reviews
- **Redis** — cache, sessions, BullMQ job queues
- **MongoDB** — chat messages, community feed posts
- **Elasticsearch** — full-text listing search (Phase 2+)

## External Services

- **Midtrans** — payment gateway (Indonesian)
- **Firebase FCM** — push notifications
- **Twilio / ZenziVa** — OTP via WhatsApp/SMS
- **OpenAI API** — AI matching & recommendations
- **Google Maps / Mapbox** — POI, routing, neighborhood data
- **Cloudinary** — image upload & CDN

## Monorepo Structure

```
apps/
  mobile/          → React Native Expo
  web/             → Next.js 14 App Router
services/
  auth/
  user/
  listing/
  booking/
  escrow/
  payment/
  chat/
  notification/
  review/
  community/
  admin/
packages/
  database/        → Prisma schema (shared)
  types/           → shared TypeScript interfaces
  config/          → shared ESLint & TS config
```

## Key Conventions

- All APIs return: `{ data, error, meta }`
- TypeScript strict mode everywhere
- Every service has its own `Dockerfile`
- Escrow service: NEVER skip tests, always audit logic
- Environment variables: never hardcode, always use `.env`

## Current Phase

**Phase 0 — Foundation Setup**
