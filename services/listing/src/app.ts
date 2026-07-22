import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";
import { prisma } from "@kostin/database";
import type { ApiResponse } from "@kostin/types";
import { loadConfig, type ListingConfig } from "./config.js";
import { createAuthenticate, createOptionalAuthenticate } from "./lib/auth-plugin.js";
import { AppError, ListingErrorCode } from "./lib/errors.js";
import { createPrismaListingRepository, type ListingRepository } from "./lib/listing-repository.js";
import { CloudinaryPhotoUploader, type PhotoUploader } from "./lib/photo-uploader.js";
import { fail } from "./lib/response.js";
import listingRoutes from "./routes/listing.routes.js";
import type { ListingDeps } from "./services/listing.service.js";

export interface BuildAppOptions {
  config?: ListingConfig;
  listingRepository?: ListingRepository;
  photoUploader?: PhotoUploader;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const config = options.config ?? loadConfig();

  const deps: ListingDeps = {
    config,
    listingRepository: options.listingRepository ?? createPrismaListingRepository(prisma),
    photoUploader:
      options.photoUploader ??
      new CloudinaryPhotoUploader({
        cloudName: config.cloudinaryCloudName,
        apiKey: config.cloudinaryApiKey,
        apiSecret: config.cloudinaryApiSecret,
      }),
  };

  const authenticate = createAuthenticate(config.jwtAccessSecret);
  const optionalAuthenticate = createOptionalAuthenticate(config.jwtAccessSecret);

  const app = Fastify({ logger: options.logger ?? true });

  void app.register(cors, { origin: config.corsOrigin });
  void app.register(multipart, {
    limits: { fileSize: config.maxPhotoUploadBytes, files: config.maxPhotosPerListing },
  });

  app.get("/health", async (): Promise<ApiResponse<{ status: string }>> => ({
    data: { status: "ok" },
    error: null,
    meta: { requestId: crypto.randomUUID() },
  }));

  void app.register(listingRoutes, { prefix: "/listings", deps, authenticate, optionalAuthenticate });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      void reply.status(error.statusCode).send(fail({ code: error.code, message: error.message }));
      return;
    }
    if (error instanceof ZodError) {
      const message = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      void reply
        .status(400)
        .send(fail({ code: ListingErrorCode.VALIDATION_ERROR, message: message || "Invalid request body" }));
      return;
    }
    if (error.code === "FST_REQ_FILE_TOO_LARGE") {
      void reply
        .status(400)
        .send(
          fail({
            code: ListingErrorCode.INVALID_FILE,
            message: `Each photo must be ${Math.floor(config.maxPhotoUploadBytes / (1024 * 1024))}MB or smaller`,
          }),
        );
      return;
    }
    if (error.code === "FST_FILES_LIMIT") {
      void reply
        .status(400)
        .send(
          fail({
            code: ListingErrorCode.TOO_MANY_PHOTOS,
            message: `A listing may have at most ${config.maxPhotosPerListing} photos`,
          }),
        );
      return;
    }
    if (error.code === "P2025") {
      // Prisma "record to update/delete not found" — surfaces if a listing
      // is deleted between the ownership check and the write.
      void reply.status(404).send(fail({ code: ListingErrorCode.NOT_FOUND, message: "Listing not found" }));
      return;
    }
    app.log.error(error);
    void reply
      .status(500)
      .send(fail({ code: ListingErrorCode.INTERNAL_ERROR, message: "Internal server error" }));
  });

  return app;
}
