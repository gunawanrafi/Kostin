import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { AppError, UserErrorCode } from "../lib/errors.js";
import { ok } from "../lib/response.js";
import {
  inviteParentSchema,
  lifestyleSchema,
  screeningCriteriaSchema,
  updateMeSchema,
} from "../lib/validation.js";
import {
  getMe,
  getScreeningCriteria,
  inviteParent,
  updateAvatar,
  updateLifestyle,
  updateMe,
  updateScreeningCriteria,
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

// For routes that also need the caller's role. Same 401 as requireUserId —
// role checks belong to the service layer, this only proves who is asking.
function requireAuthUser(request: FastifyRequest): { id: string; role: string } {
  if (!request.user) {
    throw new AppError(401, UserErrorCode.UNAUTHORIZED, "Missing or invalid Authorization header");
  }
  return request.user;
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

  // D3 · Kriteria Penyewa. GET answers with defaults for an owner who has
  // never saved any, so the form always has a real starting state.
  fastify.get("/me/screening-criteria", { preHandler: authenticate }, async (request, reply) => {
    const user = requireAuthUser(request);
    const result = await getScreeningCriteria(deps, user.id, user.role);
    return reply.status(200).send(ok(result));
  });

  fastify.put("/me/screening-criteria", { preHandler: authenticate }, async (request, reply) => {
    const user = requireAuthUser(request);
    const body = screeningCriteriaSchema.parse(request.body);
    const result = await updateScreeningCriteria(deps, user.id, user.role, body);
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
