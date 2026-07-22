import jwt, { type JwtPayload } from "jsonwebtoken";
import type { UserRole } from "@kostin/database";

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
  type: "access";
}

export class TokenError extends Error {}

// booking-service never mints tokens (that's auth-service's job) — it only
// verifies access tokens signed with the shared JWT_SECRET.
export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  let decoded: JwtPayload | string;
  try {
    decoded = jwt.verify(token, secret);
  } catch (err) {
    throw new TokenError(err instanceof Error ? err.message : "Invalid token");
  }
  if (typeof decoded === "string") throw new TokenError("Malformed token payload");
  if (decoded["type"] !== "access") throw new TokenError("Not an access token");
  return decoded as AccessTokenPayload;
}
