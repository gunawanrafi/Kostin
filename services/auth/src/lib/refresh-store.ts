import type { RedisLike } from "./redis.js";

// Tracks which refresh-token jtis are currently valid for a user, so a
// signature- and expiry-valid JWT can still be rejected after logout or
// rotation (JWTs alone can't be revoked). Key holds the userId as its value
// purely so `get` can double-check the token actually belongs to that user.
const sessionKey = (userId: string, jti: string): string => `refresh:${userId}:${jti}`;

export async function storeRefreshSession(
  redis: RedisLike,
  userId: string,
  jti: string,
  ttlSec: number,
): Promise<void> {
  await redis.set(sessionKey(userId, jti), userId, "EX", ttlSec);
}

export async function isRefreshSessionValid(
  redis: RedisLike,
  userId: string,
  jti: string,
): Promise<boolean> {
  const stored = await redis.get(sessionKey(userId, jti));
  return stored === userId;
}

// Rotation: the old jti must be invalidated so a stolen refresh token can't
// be replayed after the legitimate client has moved on to the new one.
export async function revokeRefreshSession(
  redis: RedisLike,
  userId: string,
  jti: string,
): Promise<void> {
  await redis.del(sessionKey(userId, jti));
}
