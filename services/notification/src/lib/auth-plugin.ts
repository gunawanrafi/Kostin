import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@kostin/database";
import { AppError, NotificationErrorCode } from "./errors.js";
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

// Fastify preHandler that verifies the `Authorization: Bearer <token>`
// header against auth-service's shared JWT_SECRET and attaches
// `request.user`. Used by the end-user-facing endpoints (GET /notifications,
// PATCH /notifications/:id/read) — same pattern as auth/user/listing/booking-service.
export function createAuthenticate(jwtAccessSecret: string) {
  return async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, NotificationErrorCode.UNAUTHORIZED, "Missing or invalid Authorization header");
    }

    const token = header.slice("Bearer ".length);
    try {
      const payload = verifyAccessToken(token, jwtAccessSecret);
      request.user = { id: payload.sub, role: payload.role };
    } catch (err) {
      if (err instanceof TokenError) {
        throw new AppError(401, NotificationErrorCode.UNAUTHORIZED, "Invalid or expired access token");
      }
      throw err;
    }
  };
}

export function requireAuth(request: FastifyRequest): AuthenticatedUser {
  const user = request.user;
  if (!user) {
    throw new AppError(401, NotificationErrorCode.UNAUTHORIZED, "Missing or invalid Authorization header");
  }
  return user;
}

// POST /notifications/send is "internal only" — called by other backend
// services (booking, payment, chat), not end users, so it has no user
// identity to check a JWT against. Guarded by a shared secret instead,
// mirroring how CLAUDE.md's ADMIN_JWT_SECRET is kept separate from the
// user-facing JWT_SECRET.
export function createInternalAuthenticate(internalApiKey: string) {
  return async function authenticateInternal(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const header = request.headers["x-internal-api-key"];
    if (!header || header !== internalApiKey) {
      throw new AppError(401, NotificationErrorCode.UNAUTHORIZED, "Missing or invalid internal API key");
    }
  };
}
