# KostIn

Platform cari kost berbasis AI untuk mahasiswa di Malang, Indonesia.

## Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 10
- Docker & Docker Compose
- Python >= 3.11 (for ai-service)

### Install dependencies

```bash
npm install
```

### Run all services in development

```bash
npm run dev
```

### Run a specific service

```bash
npx turbo run dev --filter=auth-service
```

## Monorepo Structure

```
apps/
  mobile/          → React Native Expo
  web/             → Next.js 14 App Router
services/
  auth/            → port 3001
  user/            → port 3002
  listing/         → port 3003
  booking/         → port 3004
  escrow/          → port 3005  ⚠ 100% test coverage required
  payment/         → port 3006
  chat/            → port 3007
  notification/    → port 3008
  review/          → port 3009
  community/       → port 3010
  admin/           → port 3011
  ai/              → port 8000  (Python + FastAPI)
packages/
  database/        → Prisma schema (shared)
  types/           → Shared TypeScript interfaces
  config/          → Shared ESLint & TypeScript configs
```

## API Contract

All services return:

```json
{ "data": ..., "error": null, "meta": {} }
```

## Environment Variables

Copy `.env.example` in each service to `.env` and fill in the values. Never hardcode secrets.
