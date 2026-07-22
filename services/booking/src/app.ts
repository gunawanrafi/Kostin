import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";
import { prisma } from "@kostin/database";
import type { ApiResponse } from "@kostin/types";
import { createAuthenticate } from "./lib/auth-plugin.js";
import { BullMqBookingQueue, type BookingQueue } from "./lib/booking-queue.js";
import { createPrismaBookingRepository, type BookingRepository } from "./lib/booking-repository.js";
import { loadConfig, type BookingConfig } from "./config.js";
import { CloudinaryDocumentUploader, type DocumentUploader } from "./lib/document-uploader.js";
import { AppError, BookingErrorCode } from "./lib/errors.js";
import { HttpEscrowClient, type EscrowClient } from "./lib/escrow-client.js";
import type { RedisLike } from "./lib/redis.js";
import { fail } from "./lib/response.js";
import bookingRoutes from "./routes/booking.routes.js";
import type { BookingDeps } from "./services/booking.service.js";

export interface BuildAppOptions {
  config?: BookingConfig;
  bookingRepository?: BookingRepository;
  redis?: RedisLike;
  bookingQueue?: BookingQueue;
  escrowClient?: EscrowClient;
  documentUploader?: DocumentUploader;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const config = options.config ?? loadConfig();

  if (!options.redis) {
    throw new AppError(
      500,
      BookingErrorCode.INTERNAL_ERROR,
      "buildApp() requires a `redis` client in production (no default — pass one explicitly, e.g. from src/index.ts)",
    );
  }
  if (!options.bookingQueue) {
    throw new AppError(
      500,
      BookingErrorCode.INTERNAL_ERROR,
      "buildApp() requires a `bookingQueue` in production (no default — pass one explicitly, e.g. from src/index.ts)",
    );
  }

  const deps: BookingDeps = {
    config,
    bookingRepository: options.bookingRepository ?? createPrismaBookingRepository(prisma),
    redis: options.redis,
    bookingQueue: options.bookingQueue,
    escrowClient: options.escrowClient ?? new HttpEscrowClient(config.escrowServiceUrl),
    documentUploader:
      options.documentUploader ??
      new CloudinaryDocumentUploader({
        cloudName: config.cloudinaryCloudName,
        apiKey: config.cloudinaryApiKey,
        apiSecret: config.cloudinaryApiSecret,
      }),
  };

  const authenticate = createAuthenticate(config.jwtAccessSecret);

  const app = Fastify({ logger: options.logger ?? true });

  void app.register(cors, { origin: config.corsOrigin });
  void app.register(multipart, {
    limits: { fileSize: config.maxDocumentUploadBytes, files: 1 },
  });

  app.get("/health", async (): Promise<ApiResponse<{ status: string }>> => ({
    data: { status: "ok" },
    error: null,
    meta: { requestId: crypto.randomUUID() },
  }));

  void app.register(bookingRoutes, { prefix: "/bookings", deps, authenticate });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      void reply.status(error.statusCode).send(fail({ code: error.code, message: error.message }));
      return;
    }
    if (error instanceof ZodError) {
      const message = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      void reply
        .status(400)
        .send(fail({ code: BookingErrorCode.VALIDATION_ERROR, message: message || "Invalid request body" }));
      return;
    }
    if (error.code === "FST_REQ_FILE_TOO_LARGE") {
      void reply
        .status(400)
        .send(
          fail({
            code: BookingErrorCode.INVALID_FILE,
            message: `Document must be ${Math.floor(config.maxDocumentUploadBytes / (1024 * 1024))}MB or smaller`,
          }),
        );
      return;
    }
    if (error.code === "P2025") {
      // Prisma "record to update not found" — surfaces if a booking is
      // deleted/mutated concurrently between the load and the write.
      void reply.status(404).send(fail({ code: BookingErrorCode.NOT_FOUND, message: "Booking not found" }));
      return;
    }
    app.log.error(error);
    void reply
      .status(500)
      .send(fail({ code: BookingErrorCode.INTERNAL_ERROR, message: "Internal server error" }));
  });

  return app;
}
