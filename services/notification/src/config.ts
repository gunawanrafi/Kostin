export interface NotificationConfig {
  port: number;
  host: string;
  corsOrigin: string;

  databaseUrl: string;
  redisUrl: string;

  // Must match auth-service's JWT_SECRET — access tokens are minted there
  // and verified here (GET /notifications, PATCH /notifications/:id/read).
  jwtAccessSecret: string;
  // Shared secret for the internal-only POST /notifications/send endpoint.
  internalApiKey: string;

  defaultPageSize: number;
  maxPageSize: number;

  firebaseProjectId: string;
  firebaseClientEmail: string;
  firebasePrivateKey: string;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function int(value: string | undefined, fallback: number): number {
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

// Reads process.env into a typed config object. Secrets fall back to dev
// defaults so `npm run dev`/tests work out of the box; production deploys
// must set JWT_SECRET / INTERNAL_API_KEY / FIREBASE_* via the environment.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): NotificationConfig {
  return {
    port: int(env["PORT"], 3008),
    host: env["HOST"] ?? "0.0.0.0",
    corsOrigin: env["CORS_ORIGIN"] ?? "*",

    databaseUrl: env["DATABASE_URL"] ?? "",
    redisUrl: env["REDIS_URL"] ?? "redis://localhost:6379",

    jwtAccessSecret: env["JWT_SECRET"] ?? "dev_access_secret_change_me",
    internalApiKey: env["INTERNAL_API_KEY"] ?? "dev_internal_api_key_change_me",

    defaultPageSize: int(env["NOTIFICATION_DEFAULT_PAGE_SIZE"], DEFAULT_PAGE_SIZE),
    maxPageSize: int(env["NOTIFICATION_MAX_PAGE_SIZE"], MAX_PAGE_SIZE),

    firebaseProjectId: env["FIREBASE_PROJECT_ID"] ?? "",
    firebaseClientEmail: env["FIREBASE_CLIENT_EMAIL"] ?? "",
    firebasePrivateKey: env["FIREBASE_PRIVATE_KEY"] ?? "",
  };
}
