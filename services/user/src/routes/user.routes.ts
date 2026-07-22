import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { AppError, UserErrorCode } from "../lib/errors.js";
import { ok } from "../lib/response.js";
import { inviteParentSchema, lifestyleSchema, updateMeSchema } from "../lib/validation.js";
import {
  getMe,
  inviteParent,
  updateAvatar,
  updateLifestyle,
  updateMe,
  type UserDeps,
} from "../services/user.service.js";

export interface UserRoutesOptions {
  deps: UserDeps;
  authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

function requireUserId(request: FastifyRequest): string {
  if (!request.user) {
    throw new AppError(401, UserErrorCode.UNAUTHORIZED, "Missing or invalid Authorization header");
  }
  return request.user.id;
}

const userRoutes: FastifyPluginAsync<UserRoutesOptions> = async (
  fastify: FastifyInstance,
  opts,
) => {
  const { deps, authenticate } = opts;

  fastify.get("/me", { preHandler: authenticate }, async (request, reply) => {
    const result = await getMe(deps, requireUserId(request));
    return reply.status(200).send(ok(result));
  });

  fastify.patch("/me", { preHandler: authenticate }, async (request, reply) => {
    const body = updateMeSchema.parse(request.body);
    const result = await updateMe(deps, requireUserId(request), body);
    return reply.status(200).send(ok(result));
  });

  fastify.post("/me/avatar", { preHandler: authenticate }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      throw new AppError(400, UserErrorCode.INVALID_FILE, "No file was uploaded");
    }
    const buffer = await file.toBuffer();
    const result = await updateAvatar(deps, requireUserId(request), {
      buffer,
      mimetype: file.mimetype,
    });
    return reply.status(200).send(ok(result));
  });

  fastify.put("/me/lifestyle", { preHandler: authenticate }, async (request, reply) => {
    const body = lifestyleSchema.parse(request.body);
    const result = await updateLifestyle(deps, requireUserId(request), body);
    return reply.status(200).send(ok(result));
  });

  fastify.post("/invite/parent", { preHandler: authenticate }, async (request, reply) => {
    const body = inviteParentSchema.parse(request.body);
    const user = request.user;
    if (!user) {
      throw new AppError(401, UserErrorCode.UNAUTHORIZED, "Missing or invalid Authorization header");
    }
    const result = await inviteParent(deps, user.id, user.role, body);
    return reply.status(201).send(ok(result));
  });
};

export default userRoutes;
