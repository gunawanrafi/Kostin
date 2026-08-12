import type { RedisLike } from "./redis.js";
import { AppError, AuthErrorCode } from "./errors.js";

// SECURITY: why an authenticated endpoint still needs a rate limit.
//
// POST /auth/password/change is the one place where knowing the *current*
// password can be probed by someone who already holds a session. A stolen or
// borrowed access token alone cannot take an account over — the attacker still
// can't change the password without the current one, and the token expires in
// 15 minutes. Without a limit, though, they could spend those 15 minutes
// guessing at full speed and convert a temporary session into permanent
// ownership. Counting wrong attempts per user closes that path.
//
// Its own `pwchange:` namespace, like password-reset-store's `pwreset:` — no
// key from one flow can influence the other.
const attemptsKey = (userId: string): string => `pwchange:${userId}:attempts`;

export interface PasswordChangeStoreConfig {
  passwordChangeMaxAttempts: number;
  passwordChangeWindowSec: number;
}

// Called before the current-password check. Throws once the allowance for the
// window is spent, so a locked-out caller never even reaches bcrypt.
export async function assertPasswordChangeAllowed(
  redis: RedisLike,
  userId: string,
  config: PasswordChangeStoreConfig,
): Promise<void> {
  const raw = await redis.get(attemptsKey(userId));
  const attempts = raw ? parseInt(raw, 10) : 0;
  if (Number.isFinite(attempts) && attempts >= config.passwordChangeMaxAttempts) {
    throw new AppError(
      429,
      AuthErrorCode.PASSWORD_CHANGE_RATE_LIMITED,
      "Too many incorrect password attempts. Try again later.",
    );
  }
}

// The TTL is set only on the first failure of a window, making it a fixed
// window rather than one a persistent guesser can keep pushing forward.
export async function recordFailedPasswordChange(
  redis: RedisLike,
  userId: string,
  config: PasswordChangeStoreConfig,
): Promise<void> {
  const attempts = await redis.incr(attemptsKey(userId));
  if (attempts === 1) {
    await redis.expire(attemptsKey(userId), config.passwordChangeWindowSec);
  }
}

// A correct current password clears the counter: the guard exists to stop
// guessing, and someone who just proved they know the password isn't guessing.
export async function clearPasswordChangeAttempts(
  redis: RedisLike,
  userId: string,
): Promise<void> {
  await redis.del(attemptsKey(userId));
}
