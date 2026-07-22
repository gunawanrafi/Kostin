import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@kostin/database";
import { AppError, ListingErrorCode } from "./errors.js";
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
// `request.user`. Built as a plain factory (not a registered plugin) so it
// can be injected via ListingDeps, same pattern as auth/user-service —
// tests can swap the secret without spinning up Fastify.
export function createAuthenticate(jwtAccessSecret: string) {
  return async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, ListingErrorCode.UNAUTHORIZED, "Missing or invalid Authorization header");
    }

    const token = header.slice("Bearer ".length);
    try {
      const payload = verifyAccessToken(token, jwtAccessSecret);
      request.user = { id: payload.sub, role: payload.role };
    } catch (err) {
      if (err instanceof TokenError) {
        throw new AppError(401, ListingErrorCode.UNAUTHORIZED, "Invalid or expired access token");
      }
      throw err;
    }
  };
}

// GET /listings stays public (marketplace browsing needs no auth), but the
// owner dashboard's "mine=true" mode needs to know who's asking. Never
// throws — an absent/invalid token just means request.user stays unset,
// same as an anonymous browser.
export function createOptionalAuthenticate(jwtAccessSecret: string) {
  return async function optionalAuthenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) return;

    const token = header.slice("Bearer ".length);
    try {
      const payload = verifyAccessToken(token, jwtAccessSecret);
      request.user = { id: payload.sub, role: payload.role };
    } catch {
      // invalid/expired token on a public route — proceed unauthenticated
    }
  };
}

// Routes call this after `authenticate` has run. Throws UNAUTHORIZED if
// somehow unset (defensive — authenticate always sets it or throws first)
// and FORBIDDEN if the caller isn't an OWNER, per "create/update = owner only".
export function requireOwner(request: FastifyRequest): AuthenticatedUser {
  const user = request.user;
  if (!user) {
    throw new AppError(401, ListingErrorCode.UNAUTHORIZED, "Missing or invalid Authorization header");
  }
  if (user.role !== "OWNER") {
    throw new AppError(403, ListingErrorCode.FORBIDDEN, "Only owner accounts can manage listings");
  }
  return user;
}
