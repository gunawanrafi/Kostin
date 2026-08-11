import type { RedisLike } from "./redis.js";
import { AppError, AuthErrorCode } from "./errors.js";
import { generateOtpCode } from "./otp.js";

// SECURITY: password-reset codes live in their own `pwreset:` namespace,
// deliberately NOT reusing otp-store's `otp:` keys.
//
// otp-store's codes are consumed by POST /auth/otp/verify, which mints a full
// access+refresh token pair. If a reset code were written to the same
// namespace, anyone holding a code emailed for a password reset could post it
// to /auth/otp/verify and get logged in outright — turning "prove you can
// receive this code" into a complete account takeover with no password.
// Separate namespaces mean a reset code is only ever usable at
// POST /auth/password/reset.
const codeKey = (email: string): string => `pwreset:${email}:code`;
const attemptsKey = (email: string): string => `pwreset:${email}:attempts`;
const cooldownKey = (email: string): string => `pwreset:${email}:cooldown`;

export interface PasswordResetStoreConfig {
  otpTtlSec: number;
  otpMaxAttempts: number;
  otpRequestCooldownSec: number;
}

export interface IssuedResetCode {
  code: string;
  expiresInSec: number;
}

// Issues a reset code for `email` and stores it under a TTL, resetting the
// attempt counter. Returns null when a cooldown is still active.
//
// Returning null rather than throwing is intentional: the caller
// (requestPasswordReset) answers identically whether or not the account
// exists, so a 429 here would reintroduce the account-enumeration leak that
// the uniform response is designed to close. Rate limiting still holds — no
// second code is generated or sent.
export async function issueResetCode(
  redis: RedisLike,
  email: string,
  config: PasswordResetStoreConfig,
): Promise<IssuedResetCode | null> {
  const remainingCooldown = await redis.ttl(cooldownKey(email));
  if (remainingCooldown > 0) return null;

  const code = generateOtpCode();
  await redis.set(codeKey(email), code, "EX", config.otpTtlSec);
  await redis.del(attemptsKey(email));
  await redis.set(cooldownKey(email), "1", "EX", config.otpRequestCooldownSec);

  return { code, expiresInSec: config.otpTtlSec };
}

// Verifies a submitted reset code. Throws RESET_CODE_EXPIRED when no code is
// on file (never requested, already expired, or already used — which also
// covers "this email has no account", so unknown addresses are indistinguishable
// from stale ones), RESET_RATE_LIMITED after too many wrong attempts, or
// RESET_CODE_INVALID on a plain mismatch.
//
// The code is consumed on success so a single reset code cannot set the
// password twice.
export async function consumeResetCode(
  redis: RedisLike,
  email: string,
  submittedCode: string,
  config: PasswordResetStoreConfig,
): Promise<void> {
  const stored = await redis.get(codeKey(email));
  if (!stored) {
    throw new AppError(
      410,
      AuthErrorCode.RESET_CODE_EXPIRED,
      "Reset code expired or was never requested",
    );
  }

  const attempts = await redis.incr(attemptsKey(email));
  if (attempts === 1) {
    // Mirror the code's TTL onto the attempts counter so the guard never
    // outlives the code it protects.
    const codeTtl = await redis.ttl(codeKey(email));
    if (codeTtl > 0) await redis.expire(attemptsKey(email), codeTtl);
  }
  if (attempts > config.otpMaxAttempts) {
    await redis.del(codeKey(email), attemptsKey(email));
    throw new AppError(429, AuthErrorCode.RESET_RATE_LIMITED, "Too many incorrect reset attempts");
  }

  if (stored !== submittedCode) {
    throw new AppError(400, AuthErrorCode.RESET_CODE_INVALID, "Incorrect reset code");
  }

  await redis.del(codeKey(email), attemptsKey(email), cooldownKey(email));
}
