import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { requireAuth } from "../lib/auth-plugin.js";
import { AppError, BookingErrorCode } from "../lib/errors.js";
import { ok } from "../lib/response.js";
import {
  bookingDraftSchema,
  createBookingSchema,
  documentQuerySchema,
  listBookingsQuerySchema,
} from "../lib/validation.js";
import {
  cancelBooking,
  confirmBooking,
  createBooking,
  getBooking,
  getBookingDraft,
  listBookings,
  saveBookingDraft,
  uploadDocument,
  type BookingDeps,
} from "../services/booking.service.js";

export interface BookingRoutesOptions {
  deps: BookingDeps;
  authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

const bookingRoutes: FastifyPluginAsync<BookingRoutesOptions> = async (
  fastify: FastifyInstance,
  opts,
) => {
  const { deps, authenticate } = opts;

  // Session-recovery draft endpoints — registered before "/:id" so "draft"
  // is never captured as a booking id (see listing-service's "/search" for
  // the same convention).
  fastify.put("/draft/:listingId", { preHandler: authenticate }, async (request, reply) => {
    const user = requireAuth(request);
    const { listingId } = request.params as { listingId: string };
    const body = bookingDraftSchema.parse(request.body);
    const result = await saveBookingDraft(deps, user.id, listingId, body);
    return reply.status(200).send(ok(result));
  });

  fastify.get("/draft/:listingId", { preHandler: authenticate }, async (request, reply) => {
    const user = requireAuth(request);
    const { listingId } = request.params as { listingId: string };
    const result = await getBookingDraft(deps, user.id, listingId);
    return reply.status(200).send(ok(result));
  });

  fastify.get("/", { preHandler: authenticate }, async (request, reply) => {
    const user = requireAuth(request);
    const query = listBookingsQuerySchema.parse(request.query);
    const result = await listBookings(deps, user, query);
    return reply
      .status(200)
      .send(ok(result.items, { page: result.page, limit: result.limit, total: result.total }));
  });

  fastify.post("/", { preHandler: authenticate }, async (request, reply) => {
    const user = requireAuth(request);
    const body = createBookingSchema.parse(request.body);
    const result = await createBooking(deps, user.id, body);
    return reply.status(201).send(ok(result));
  });

  fastify.get("/:id", { preHandler: authenticate }, async (request, reply) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    const result = await getBooking(deps, user.id, id);
    return reply.status(200).send(ok(result));
  });

  fastify.patch("/:id/confirm", { preHandler: authenticate }, async (request, reply) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    const result = await confirmBooking(deps, user.id, id);
    return reply.status(200).send(ok(result));
  });

  fastify.patch("/:id/cancel", { preHandler: authenticate }, async (request, reply) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    const result = await cancelBooking(deps, user.id, id);
    return reply.status(200).send(ok(result));
  });

  fastify.post("/:id/documents", { preHandler: authenticate }, async (request, reply) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    const { type } = documentQuerySchema.parse(request.query);

    const file = await request.file();
    if (!file) {
      throw new AppError(400, BookingErrorCode.INVALID_FILE, "No file was uploaded");
    }
    const buffer = await file.toBuffer();

    const result = await uploadDocument(deps, user.id, id, type, { buffer, mimetype: file.mimetype });
    return reply.status(200).send(ok(result));
  });
};

export default bookingRoutes;
