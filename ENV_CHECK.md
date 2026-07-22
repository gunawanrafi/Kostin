# Environment Variable Loading — Verification Report

Date: 2026-07-16

## Summary

**All 11 Node.js services are fixed.** Each `services/*/src/index.ts` loads
the root `.env` via `dotenv.config()` before any code that reads
`process.env` or touches `@kostin/database` (Prisma).

## Method

1. Inspected each `services/*/src/index.ts` to confirm:
   - `dotenv` is imported and `dotenv.config()` is called near the top of the file.
   - Anything that depends on env vars (Fastify app construction, `@kostin/database`,
     `./config.js`, Redis clients) either appears strictly after the
     `dotenv.config()` call, or is loaded via dynamic `await import(...)`
     placed after it (so it can't be hoisted ahead of the config call, which
     a static `import` would be under ESM semantics).
2. Ran a live check per service (from inside each `services/<name>` directory):

   ```js
   import dotenv from 'dotenv';
   import path from 'path';
   dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
   console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Missing');
   console.log('REDIS_URL:', process.env.REDIS_URL ? 'Found' : 'Missing');
   console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Found' : 'Missing');
   console.log('MONGODB_URL:', process.env.MONGODB_URL ? 'Found' : 'Missing');
   ```

3. Additionally boot-tested `auth`, `listing`, `booking`, and `notification`
   with `tsx watch src/index.ts` — all reached "Server listening", and
   `booking-service` executed live Prisma queries against Postgres,
   confirming `DATABASE_URL` works end-to-end (not just "present as a string").

Note: the actual services resolve the `.env` path from the file's own
location (`path.dirname(fileURLToPath(import.meta.url))`), not
`process.cwd()`. That's intentionally more robust than a `cwd`-relative
path — it resolves correctly whether the service is started via
`tsx watch`, `node dist/index.js`, from the repo root via turbo, or from
the service's own directory. The `process.cwd()`-based snippet above was
only used as the ad-hoc verification probe, run from each service's own
directory to line up with its `../../.env` offset.

## Per-service results

| Service | dotenv.config() before other env-reads | DATABASE_URL | REDIS_URL | JWT_SECRET | MONGODB_URL |
|---|---|---|---|---|---|
| auth | ✅ (line 10) | ✅ | ✅ | ✅ | ✅ |
| user | ✅ (line 9) | ✅ | ✅ | ✅ | ✅ |
| listing | ✅ (line 9) | ✅ | ✅ | ✅ | ✅ |
| booking | ✅ (line 10; `@kostin/database` dynamically imported at line 13, after) | ✅ | ✅ | ✅ | ✅ |
| escrow | ✅ (line 11) | ✅ | ✅ | ✅ | ✅ |
| payment | ✅ (line 9) | ✅ | ✅ | ✅ | ✅ |
| chat | ✅ (line 11) | ✅ | ✅ | ✅ | ✅ |
| notification | ✅ (line 10; `@kostin/database` dynamically imported at line 15, after) | ✅ | ✅ | ✅ | ✅ |
| review | ✅ (line 9) | ✅ | ✅ | ✅ | ✅ |
| community | ✅ (line 9) | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ (line 9) | ✅ | ✅ | ✅ | ✅ |

(`REDIS_URL`/`JWT_SECRET`/`MONGODB_URL` are checked across all services here
only as generic proof that `.env` loads fully — not every service consumes
every one of these vars per the service table in `CLAUDE.md`.)

## Outstanding issues

None. No service needed changes — the dotenv fix was already in place across
all 11 services.
