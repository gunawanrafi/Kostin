import jwt, { type JwtPayload } from "jsonwebtoken";
import type { UserRole } from "@kostin/database";

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
  type: "access";
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  jti: string;
  type: "refresh";
}

export function signAccessToken(
  userId: string,
  role: UserRole,
  secret: string,
  ttlSec: number,
): string {
  const payload: Omit<AccessTokenPayload, keyof JwtPayload> = {
    sub: userId,
    role,
    type: "access",
  };
  return jwt.sign(payload, secret, { expiresIn: ttlSec });
}

export function signRefreshToken(
  userId: string,
  jti: string,
  secret: string,
  ttlSec: number,
): string {
  const payload: Omit<RefreshTokenPayload, keyof JwtPayload> = {
    sub: userId,
    jti,
    type: "refresh",
  };
  return jwt.sign(payload, secret, { expiresIn: ttlSec });
}

export class TokenError extends Error {}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  const payload = verify(token, secret);
  if (payload.type !== "access") throw new TokenError("Not an access token");
  return payload as AccessTokenPayload;
}

export function verifyRefreshToken(token: string, secret: string): RefreshTokenPayload {
  const payload = verify(token, secret);
  if (payload.type !== "refresh") throw new TokenError("Not a refresh token");
  return payload as RefreshTokenPayload;
}

function verify(token: string, secret: string): JwtPayload & { type?: string } {
  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === "string") throw new TokenError("Malformed token payload");
    return decoded;
  } catch (err) {
    if (err instanceof TokenError) throw err;
    throw new TokenError(err instanceof Error ? err.message : "Invalid token");
  }
}
