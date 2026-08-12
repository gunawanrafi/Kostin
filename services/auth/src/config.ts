export interface AuthConfig {
  port: number;
  host: string;
  corsOrigin: string;

  databaseUrl: string;
  redisUrl: string;

  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  // Requirement: access token 15m, refresh token 7d.
  accessTokenTtlSec: number;
  refreshTokenTtlSec: number;

  otpTtlSec: number;
  otpMaxAttempts: number;
  otpRequestCooldownSec: number;

  // Wrong current-password attempts allowed on POST /auth/password/change,
  // per user, per window. Kept separate from the OTP counters: those guard a
  // 6-digit code, this guards a real password.
  passwordChangeMaxAttempts: number;
  passwordChangeWindowSec: number;

  googleClientId: string;

  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioWhatsappFrom: string;
}

const DEFAULT_ACCESS_TTL_SEC = 15 * 60;
const DEFAULT_REFRESH_TTL_SEC = 7 * 24 * 60 * 60;
const DEFAULT_OTP_TTL_SEC = 5 * 60;
const DEFAULT_OTP_MAX_ATTEMPTS = 5;
const DEFAULT_OTP_COOLDOWN_SEC = 60;
const DEFAULT_PASSWORD_CHANGE_MAX_ATTEMPTS = 5;
const DEFAULT_PASSWORD_CHANGE_WINDOW_SEC = 15 * 60;

function int(value: string | undefined, fallback: number): number {
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

// Reads process.env into a typed config object. Secrets fall back to dev
// defaults so `npm run dev`/tests work out of the box; production deploys
// must set JWT_SECRET / REFRESH_TOKEN_SECRET via the environment.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  return {
    port: int(env["PORT"], 3001),
    host: env["HOST"] ?? "0.0.0.0",
    corsOrigin: env["CORS_ORIGIN"] ?? "*",

    databaseUrl: env["DATABASE_URL"] ?? "",
    redisUrl: env["REDIS_URL"] ?? "redis://localhost:6379",

    jwtAccessSecret: env["JWT_SECRET"] ?? "dev_access_secret_change_me",
    jwtRefreshSecret: env["REFRESH_TOKEN_SECRET"] ?? "dev_refresh_secret_change_me",
    accessTokenTtlSec: int(env["ACCESS_TOKEN_TTL_SEC"], DEFAULT_ACCESS_TTL_SEC),
    refreshTokenTtlSec: int(env["REFRESH_TOKEN_TTL_SEC"], DEFAULT_REFRESH_TTL_SEC),

    otpTtlSec: int(env["OTP_TTL_SEC"], DEFAULT_OTP_TTL_SEC),
    otpMaxAttempts: int(env["OTP_MAX_ATTEMPTS"], DEFAULT_OTP_MAX_ATTEMPTS),
    otpRequestCooldownSec: int(env["OTP_REQUEST_COOLDOWN_SEC"], DEFAULT_OTP_COOLDOWN_SEC),

    passwordChangeMaxAttempts: int(
      env["PASSWORD_CHANGE_MAX_ATTEMPTS"],
      DEFAULT_PASSWORD_CHANGE_MAX_ATTEMPTS,
    ),
    passwordChangeWindowSec: int(
      env["PASSWORD_CHANGE_WINDOW_SEC"],
      DEFAULT_PASSWORD_CHANGE_WINDOW_SEC,
    ),

    googleClientId: env["GOOGLE_CLIENT_ID"] ?? "",

    twilioAccountSid: env["TWILIO_ACCOUNT_SID"] ?? "",
    twilioAuthToken: env["TWILIO_AUTH_TOKEN"] ?? "",
    twilioWhatsappFrom: env["TWILIO_WHATSAPP_FROM"] ?? "whatsapp:+14155238886",
  };
}
