import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@kostin/database";
import { AppError, AuthErrorCode } from "./errors.js";
import { TokenError, verifyAccessToken } from "./jwt.js";

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

// Fastify preHandler that verifies `Authorization: Bearer <token>` and
// attaches `request.user`. Mirrors user-service's lib/auth-plugin.ts — most of
// auth-service is deliberately unauthenticated (you can't hold a token before
// you log in), but POST /auth/password/change acts on the *caller's own*
// account, so it needs the caller identified.
//
// Built as a plain factory rather than a registered plugin so the secret is
// injected the same way every other dependency in this service is, and tests
// can build an app with a known signing key.
export function createAuthenticate(jwtAccessSecret: string) {
  return async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, AuthErrorCode.UNAUTHORIZED, "Missing or invalid Authorization header");
    }

    const token = header.slice("Bearer ".length);
    try {
      const payload = verifyAccessToken(token, jwtAccessSecret);
      request.user = { id: payload.sub, role: payload.role };
    } catch (err) {
      if (err instanceof TokenError) {
        throw new AppError(401, AuthErrorCode.UNAUTHORIZED, "Invalid or expired access token");
      }
      throw err;
    }
  };
}
