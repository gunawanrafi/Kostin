export interface UserConfig {
  port: number;
  host: string;
  corsOrigin: string;

  databaseUrl: string;

  // Must match auth-service's JWT_SECRET — access tokens are minted there
  // and verified here.
  jwtAccessSecret: string;

  parentInviteTtlSec: number;

  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
}

const DEFAULT_PARENT_INVITE_TTL_SEC = 7 * 24 * 60 * 60;

function int(value: string | undefined, fallback: number): number {
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

// Reads process.env into a typed config object. Secrets fall back to dev
// defaults so `npm run dev`/tests work out of the box; production deploys
// must set JWT_SECRET / CLOUDINARY_* via the environment.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): UserConfig {
  return {
    port: int(env["PORT"], 3002),
    host: env["HOST"] ?? "0.0.0.0",
    corsOrigin: env["CORS_ORIGIN"] ?? "*",

    databaseUrl: env["DATABASE_URL"] ?? "",

    jwtAccessSecret: env["JWT_SECRET"] ?? "dev_access_secret_change_me",

    parentInviteTtlSec: int(env["PARENT_INVITE_TTL_SEC"], DEFAULT_PARENT_INVITE_TTL_SEC),

    cloudinaryCloudName: env["CLOUDINARY_CLOUD_NAME"] ?? "",
    cloudinaryApiKey: env["CLOUDINARY_API_KEY"] ?? "",
    cloudinaryApiSecret: env["CLOUDINARY_API_SECRET"] ?? "",
  };
}
