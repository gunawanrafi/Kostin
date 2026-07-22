import type { RedisLike } from "./redis.js";
import { AppError, AuthErrorCode } from "./errors.js";
import { generateOtpCode, type OtpSender } from "./otp.js";

const codeKey = (phone: string): string => `otp:${phone}:code`;
const attemptsKey = (phone: string): string => `otp:${phone}:attempts`;
const cooldownKey = (phone: string): string => `otp:${phone}:cooldown`;

export interface OtpStoreConfig {
  otpTtlSec: number;
  otpMaxAttempts: number;
  otpRequestCooldownSec: number;
}

// Generates a code, stores it in Redis (keyed by phone) with a TTL, resets
// the attempt counter, and dispatches it over WhatsApp. Throws OTP_COOLDOWN
// if called again for the same phone before the cooldown window elapses, to
// stop OTP-spam / toll fraud against the WhatsApp send.
export async function requestOtp(
  redis: RedisLike,
  sender: OtpSender,
  phone: string,
  config: OtpStoreConfig,
): Promise<{ expiresInSec: number }> {
  const remainingCooldown = await redis.ttl(cooldownKey(phone));
  if (remainingCooldown > 0) {
    throw new AppError(
      429,
      AuthErrorCode.OTP_COOLDOWN,
      `Please wait ${remainingCooldown}s before requesting another OTP`,
    );
  }

  const code = generateOtpCode();
  await redis.set(codeKey(phone), code, "EX", config.otpTtlSec);
  await redis.del(attemptsKey(phone));
  await redis.set(cooldownKey(phone), "1", "EX", config.otpRequestCooldownSec);

  await sender.sendWhatsappOtp(phone, code);

  return { expiresInSec: config.otpTtlSec };
}

// Verifies a submitted code against the stored one. Throws OTP_EXPIRED if no
// code is on file (never requested or already expired), OTP_RATE_LIMITED
// after too many wrong attempts, or OTP_INVALID on a plain mismatch. On
// success the code is consumed (deleted) so it cannot be replayed.
export async function verifyOtp(
  redis: RedisLike,
  phone: string,
  submittedCode: string,
  config: OtpStoreConfig,
): Promise<void> {
  const stored = await redis.get(codeKey(phone));
  if (!stored) {
    throw new AppError(410, AuthErrorCode.OTP_EXPIRED, "OTP expired or was never requested");
  }

  const attempts = await redis.incr(attemptsKey(phone));
  if (attempts === 1) {
    // First attempt for this code — mirror the code's TTL onto the
    // attempts counter so it doesn't outlive the code it's guarding.
    const codeTtl = await redis.ttl(codeKey(phone));
    if (codeTtl > 0) await redis.expire(attemptsKey(phone), codeTtl);
  }
  if (attempts > config.otpMaxAttempts) {
    await redis.del(codeKey(phone), attemptsKey(phone));
    throw new AppError(429, AuthErrorCode.OTP_RATE_LIMITED, "Too many incorrect OTP attempts");
  }

  if (stored !== submittedCode) {
    throw new AppError(400, AuthErrorCode.OTP_INVALID, "Incorrect OTP code");
  }

  await redis.del(codeKey(phone), attemptsKey(phone));
}
