import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";
import { prisma } from "@kostin/database";
import type { ApiResponse } from "@kostin/types";
import { loadConfig, type UserConfig } from "./config.js";
import { createAuthenticate } from "./lib/auth-plugin.js";
import { CloudinaryAvatarUploader, type AvatarUploader } from "./lib/avatar-uploader.js";
import { AppError, UserErrorCode } from "./lib/errors.js";
import {
  createPrismaParentInviteRepository,
  type ParentInviteRepository,
} from "./lib/parent-invite-repository.js";
import { fail } from "./lib/response.js";
import { createPrismaUserRepository, type UserRepository } from "./lib/user-repository.js";
import userRoutes from "./routes/user.routes.js";
import type { UserDeps } from "./services/user.service.js";

const MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface BuildAppOptions {
  config?: UserConfig;
  userRepository?: UserRepository;
  parentInviteRepository?: ParentInviteRepository;
  avatarUploader?: AvatarUploader;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const config = options.config ?? loadConfig();

  const deps: UserDeps = {
    config,
    userRepository: options.userRepository ?? createPrismaUserRepository(prisma),
    parentInviteRepository: options.parentInviteRepository ?? createPrismaParentInviteRepository(prisma),
    avatarUploader:
      options.avatarUploader ??
      new CloudinaryAvatarUploader({
        cloudName: config.cloudinaryCloudName,
        apiKey: config.cloudinaryApiKey,
        apiSecret: config.cloudinaryApiSecret,
      }),
  };

  const authenticate = createAuthenticate(config.jwtAccessSecret);

  const app = Fastify({ logger: options.logger ?? true });

  void app.register(cors, { origin: config.corsOrigin });
  void app.register(multipart, {
    limits: { fileSize: MAX_AVATAR_UPLOAD_BYTES, files: 1 },
  });

  app.get("/health", async (): Promise<ApiResponse<{ status: string }>> => ({
    data: { status: "ok" },
    error: null,
    meta: { requestId: crypto.randomUUID() },
  }));

  void app.register(userRoutes, { prefix: "/users", deps, authenticate });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      void reply.status(error.statusCode).send(fail({ code: error.code, message: error.message }));
      return;
    }
    if (error instanceof ZodError) {
      const message = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      void reply
        .status(400)
        .send(fail({ code: UserErrorCode.VALIDATION_ERROR, message: message || "Invalid request body" }));
      return;
    }
    if (error.code === "FST_REQ_FILE_TOO_LARGE") {
      void reply
        .status(400)
        .send(fail({ code: UserErrorCode.INVALID_FILE, message: "Avatar must be 5MB or smaller" }));
      return;
    }
    app.log.error(error);
    void reply
      .status(500)
      .send(fail({ code: UserErrorCode.INTERNAL_ERROR, message: "Internal server error" }));
  });

  return app;
}
