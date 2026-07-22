export interface BookingConfig {
  port: number;
  host: string;
  corsOrigin: string;

  databaseUrl: string;
  redisUrl: string;

  // Must match auth-service's JWT_SECRET — access tokens are minted there
  // and verified here.
  jwtAccessSecret: string;

  escrowServiceUrl: string;

  // Requirement: auto-cancel a PENDING booking if the owner doesn't confirm
  // within 24h.
  autoCancelDelayMs: number;
  // Requirement: session-recovery drafts survive the user leaving mid-flow;
  // TTL bounds how long an abandoned draft lingers in Redis.
  draftTtlSec: number;

  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  maxDocumentUploadBytes: number;

  defaultPageSize: number;
  maxPageSize: number;
}

const DEFAULT_AUTO_CANCEL_DELAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DRAFT_TTL_SEC = 24 * 60 * 60;
const DEFAULT_MAX_DOCUMENT_UPLOAD_BYTES = 8 * 1024 * 1024;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function int(value: string | undefined, fallback: number): number {
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

// Reads process.env into a typed config object. Secrets fall back to dev
// defaults so `npm run dev`/tests work out of the box; production deploys
// must set JWT_SECRET / CLOUDINARY_* via the environment.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): BookingConfig {
  return {
    port: int(env["PORT"], 3004),
    host: env["HOST"] ?? "0.0.0.0",
    corsOrigin: env["CORS_ORIGIN"] ?? "*",

    databaseUrl: env["DATABASE_URL"] ?? "",
    redisUrl: env["REDIS_URL"] ?? "redis://localhost:6379",

    jwtAccessSecret: env["JWT_SECRET"] ?? "dev_access_secret_change_me",

    escrowServiceUrl: env["ESCROW_SERVICE_URL"] ?? "http://localhost:3005",

    autoCancelDelayMs: int(env["BOOKING_AUTO_CANCEL_DELAY_MS"], DEFAULT_AUTO_CANCEL_DELAY_MS),
    draftTtlSec: int(env["BOOKING_DRAFT_TTL_SEC"], DEFAULT_DRAFT_TTL_SEC),

    cloudinaryCloudName: env["CLOUDINARY_CLOUD_NAME"] ?? "",
    cloudinaryApiKey: env["CLOUDINARY_API_KEY"] ?? "",
    cloudinaryApiSecret: env["CLOUDINARY_API_SECRET"] ?? "",
    maxDocumentUploadBytes: int(env["BOOKING_MAX_DOCUMENT_UPLOAD_BYTES"], DEFAULT_MAX_DOCUMENT_UPLOAD_BYTES),

    defaultPageSize: int(env["BOOKING_DEFAULT_PAGE_SIZE"], DEFAULT_PAGE_SIZE),
    maxPageSize: int(env["BOOKING_MAX_PAGE_SIZE"], MAX_PAGE_SIZE),
  };
}
