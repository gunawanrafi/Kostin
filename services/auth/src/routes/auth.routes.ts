import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { AppError, AuthErrorCode } from "../lib/errors.js";
import { ok } from "../lib/response.js";
import type { AuthDeps } from "../services/auth.service.js";
import {
  changePassword,
  loginUser,
  loginWithGoogle,
  logoutUser,
  refreshTokens,
  registerUser,
  requestOtpForPhone,
  requestPasswordReset,
  resetPassword,
  verifyOtpAndIssueTokens,
} from "../services/auth.service.js";
import {
  loginGoogleSchema,
  loginSchema,
  logoutSchema,
  otpRequestSchema,
  otpVerifySchema,
  passwordChangeSchema,
  passwordForgotSchema,
  passwordResetSchema,
  refreshSchema,
  registerSchema,
} from "../lib/validation.js";

export interface AuthRoutesOptions {
  deps: AuthDeps;
  authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

function requireUserId(request: FastifyRequest): string {
  if (!request.user) {
    throw new AppError(401, AuthErrorCode.UNAUTHORIZED, "Missing or invalid Authorization header");
  }
  return request.user.id;
}

const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  fastify: FastifyInstance,
  opts,
) => {
  const { deps, authenticate } = opts;

  fastify.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const result = await registerUser(deps, body);
    return reply.status(201).send(ok(result));
  });

  fastify.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await loginUser(deps, body);
    return reply.status(200).send(ok(result));
  });

  fastify.post("/login/google", async (request, reply) => {
    const body = loginGoogleSchema.parse(request.body);
    const result = await loginWithGoogle(deps, body);
    return reply.status(200).send(ok(result));
  });

  fastify.post("/otp/request", async (request, reply) => {
    const body = otpRequestSchema.parse(request.body);
    const result = await requestOtpForPhone(deps, body);
    return reply.status(200).send(ok(result));
  });

  fastify.post("/otp/verify", async (request, reply) => {
    const body = otpVerifySchema.parse(request.body);
    const result = await verifyOtpAndIssueTokens(deps, body);
    return reply.status(200).send(ok(result));
  });

  // Always 200 with an identical body, whether or not the email is
  // registered — see requestPasswordReset for why.
  fastify.post("/password/forgot", async (request, reply) => {
    const body = passwordForgotSchema.parse(request.body);
    const result = await requestPasswordReset(deps, body);
    return reply.status(200).send(ok(result));
  });

  fastify.post("/password/reset", async (request, reply) => {
    const body = passwordResetSchema.parse(request.body);
    const result = await resetPassword(deps, body);
    return reply.status(200).send(ok(result));
  });

  // The only authenticated route in this service — it acts on the caller's
  // own account, identified by the access token rather than by anything in
  // the body.
  fastify.post("/password/change", { preHandler: authenticate }, async (request, reply) => {
    const body = passwordChangeSchema.parse(request.body);
    const result = await changePassword(deps, requireUserId(request), body);
    return reply.status(200).send(ok(result));
  });

  fastify.post("/refresh", async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    const result = await refreshTokens(deps, body);
    return reply.status(200).send(ok(result));
  });

  fastify.post("/logout", async (request, reply) => {
    const body = logoutSchema.parse(request.body);
    await logoutUser(deps, body);
    return reply.status(200).send(ok({ success: true }));
  });
};

export default authRoutes;
