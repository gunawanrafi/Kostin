import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { prisma } from "@kostin/database";
import type { ApiResponse } from "@kostin/types";
import { createAuthenticate, createInternalAuthenticate } from "./lib/auth-plugin.js";
import { loadConfig, type NotificationConfig } from "./config.js";
import { AppError, NotificationErrorCode } from "./lib/errors.js";
import {
  createPrismaNotificationRepository,
  type NotificationRepository,
} from "./lib/notification-repository.js";
import type { NotificationQueue } from "./lib/notification-queue.js";
import { fail } from "./lib/response.js";
import notificationRoutes from "./routes/notification.routes.js";
import type { NotificationDeps } from "./services/notification.service.js";

export interface BuildAppOptions {
  config?: NotificationConfig;
  notificationRepository?: NotificationRepository;
  notificationQueue?: NotificationQueue;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const config = options.config ?? loadConfig();

  if (!options.notificationQueue) {
    throw new AppError(
      500,
      NotificationErrorCode.INTERNAL_ERROR,
      "buildApp() requires a `notificationQueue` in production (no default — pass one explicitly, e.g. from src/index.ts)",
    );
  }

  const deps: NotificationDeps = {
    config,
    notificationRepository: options.notificationRepository ?? createPrismaNotificationRepository(prisma),
    notificationQueue: options.notificationQueue,
  };

  const authenticate = createAuthenticate(config.jwtAccessSecret);
  const authenticateInternal = createInternalAuthenticate(config.internalApiKey);

  const app = Fastify({ logger: options.logger ?? true });

  void app.register(cors, { origin: config.corsOrigin });

  app.get("/health", async (): Promise<ApiResponse<{ status: string }>> => ({
    data: { status: "ok" },
    error: null,
    meta: { requestId: crypto.randomUUID() },
  }));

  void app.register(notificationRoutes, { prefix: "/notifications", deps, authenticate, authenticateInternal });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      void reply.status(error.statusCode).send(fail({ code: error.code, message: error.message }));
      return;
    }
    if (error instanceof ZodError) {
      const message = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      void reply
        .status(400)
        .send(fail({ code: NotificationErrorCode.VALIDATION_ERROR, message: message || "Invalid request body" }));
      return;
    }
    if (error.code === "P2025") {
      void reply
        .status(404)
        .send(fail({ code: NotificationErrorCode.NOT_FOUND, message: "Notification not found" }));
      return;
    }
    // Fastify's own framework errors (unsupported/missing Content-Type,
    // malformed JSON, payload too large, …) already carry an accurate 4xx
    // statusCode and an FST_ERR_* code. Forward those instead of flattening
    // them into a 500 — masking them here is what made a bodyless PATCH with
    // axios's default `application/x-www-form-urlencoded` header look like an
    // unexplained "Internal server error" rather than the 415 it really was.
    // 5xx still logs and returns the opaque message, so genuine server faults
    // leak nothing.
    const statusCode = typeof error.statusCode === "number" ? error.statusCode : 500;
    if (statusCode >= 400 && statusCode < 500) {
      void reply
        .status(statusCode)
        .send(fail({ code: error.code ?? NotificationErrorCode.VALIDATION_ERROR, message: error.message }));
      return;
    }

    app.log.error(error);
    void reply
      .status(500)
      .send(fail({ code: NotificationErrorCode.INTERNAL_ERROR, message: "Internal server error" }));
  });

  return app;
}
