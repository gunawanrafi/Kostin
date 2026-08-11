import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { ok } from "../lib/response.js";
import type { AuthDeps } from "../services/auth.service.js";
import {
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
  passwordForgotSchema,
  passwordResetSchema,
  refreshSchema,
  registerSchema,
} from "../lib/validation.js";

export interface AuthRoutesOptions {
  deps: AuthDeps;
}

const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  fastify: FastifyInstance,
  opts,
) => {
  const { deps } = opts;

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
