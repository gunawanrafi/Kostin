import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { requireAuth } from "../lib/auth-plugin.js";
import { ok } from "../lib/response.js";
import { listNotificationsQuerySchema, sendNotificationSchema } from "../lib/validation.js";
import {
  listNotifications,
  markNotificationRead,
  sendNotification,
  type NotificationDeps,
} from "../services/notification.service.js";

export interface NotificationRoutesOptions {
  deps: NotificationDeps;
  authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  authenticateInternal: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

const notificationRoutes: FastifyPluginAsync<NotificationRoutesOptions> = async (
  fastify: FastifyInstance,
  opts,
) => {
  const { deps, authenticate, authenticateInternal } = opts;

  fastify.post("/send", { preHandler: authenticateInternal }, async (request, reply) => {
    const body = sendNotificationSchema.parse(request.body);
    const result = await sendNotification(deps, body);
    return reply.status(201).send(ok(result));
  });

  fastify.get("/", { preHandler: authenticate }, async (request, reply) => {
    const user = requireAuth(request);
    const query = listNotificationsQuerySchema.parse(request.query);
    const result = await listNotifications(deps, user.id, query);
    return reply
      .status(200)
      .send(ok(result.items, { page: result.page, limit: result.limit, total: result.total }));
  });

  fastify.patch("/:id/read", { preHandler: authenticate }, async (request, reply) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    const result = await markNotificationRead(deps, user.id, id);
    return reply.status(200).send(ok(result));
  });
};

export default notificationRoutes;
