import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { prisma } from "@kostin/database";
import type { ApiResponse } from "@kostin/types";
import { loadConfig, type AuthConfig } from "./config.js";
import { AppError, AuthErrorCode } from "./lib/errors.js";
import { fail } from "./lib/response.js";
import { GoogleOAuthVerifier, type GoogleVerifier } from "./lib/google.js";
import { ConsoleOtpSender, TwilioOtpSender, type OtpSender } from "./lib/otp.js";
import type { RedisLike } from "./lib/redis.js";
import { createPrismaUserRepository, type UserRepository } from "./lib/user-repository.js";
import authRoutes from "./routes/auth.routes.js";
import type { AuthDeps } from "./services/auth.service.js";

export interface BuildAppOptions {
  config?: AuthConfig;
  userRepository?: UserRepository;
  redis?: RedisLike;
  otpSender?: OtpSender;
  googleVerifier?: GoogleVerifier;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const config = options.config ?? loadConfig();

  if (!options.redis) {
    throw new AppError(
      500,
      AuthErrorCode.INTERNAL_ERROR,
      "buildApp() requires a `redis` client in production (no default — pass one explicitly, e.g. from src/index.ts)",
    );
  }

  const deps: AuthDeps = {
    config,
    userRepository: options.userRepository ?? createPrismaUserRepository(prisma),
    redis: options.redis,
    // Without Twilio credentials nothing can actually be delivered, so the
    // dev fallback logs the code rather than silently dropping it — otherwise
    // OTP and password-reset flows look like they sent something when they
    // didn't. NoopOtpSender is still exported for tests that want silence.
    otpSender:
      options.otpSender ??
      (config.twilioAccountSid
        ? new TwilioOtpSender(config.twilioAccountSid, config.twilioAuthToken, config.twilioWhatsappFrom)
        : new ConsoleOtpSender()),
    googleVerifier: options.googleVerifier ?? new GoogleOAuthVerifier(config.googleClientId),
  };

  const app = Fastify({ logger: options.logger ?? true });

  void app.register(cors, { origin: config.corsOrigin });

  app.get("/health", async (): Promise<ApiResponse<{ status: string }>> => ({
    data: { status: "ok" },
    error: null,
    meta: { requestId: crypto.randomUUID() },
  }));

  void app.register(authRoutes, { prefix: "/auth", deps });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      void reply.status(error.statusCode).send(fail({ code: error.code, message: error.message }));
      return;
    }
    if (error instanceof ZodError) {
      const message = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      void reply
        .status(400)
        .send(fail({ code: AuthErrorCode.VALIDATION_ERROR, message: message || "Invalid request body" }));
      return;
    }
    app.log.error(error);
    void reply
      .status(500)
      .send(fail({ code: AuthErrorCode.INTERNAL_ERROR, message: "Internal server error" }));
  });

  return app;
}
