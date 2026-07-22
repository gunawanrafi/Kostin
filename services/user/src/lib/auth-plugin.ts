import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@kostin/database";
import { AppError, UserErrorCode } from "./errors.js";
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
// can be injected via AuthDeps, same pattern as the rest of this service's
// dependencies — tests can swap the secret without spinning up Fastify.
export function createAuthenticate(jwtAccessSecret: string) {
  return async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, UserErrorCode.UNAUTHORIZED, "Missing or invalid Authorization header");
    }

    const token = header.slice("Bearer ".length);
    try {
      const payload = verifyAccessToken(token, jwtAccessSecret);
      request.user = { id: payload.sub, role: payload.role };
    } catch (err) {
      if (err instanceof TokenError) {
        throw new AppError(401, UserErrorCode.UNAUTHORIZED, "Invalid or expired access token");
      }
      throw err;
    }
  };
}
