import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { requireOwner } from "../lib/auth-plugin.js";
import { ok } from "../lib/response.js";
import {
  createListingSchema,
  createRoomSchema,
  listQuerySchema,
  searchQuerySchema,
  updateListingSchema,
} from "../lib/validation.js";
import { createRoom, listRooms } from "../services/room.service.js";
import {
  addPhotos,
  createListing,
  deleteListing,
  getListing,
  listListings,
  searchListings,
  updateListing,
  type ListingDeps,
  type PhotoFile,
} from "../services/listing.service.js";

export interface ListingRoutesOptions {
  deps: ListingDeps;
  authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  optionalAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

const listingRoutes: FastifyPluginAsync<ListingRoutesOptions> = async (
  fastify: FastifyInstance,
  opts,
) => {
  const { deps, authenticate, optionalAuthenticate } = opts;

  // Registered before "/:id" — Fastify's router matches static segments
  // ahead of parametric ones regardless of order, but this keeps intent
  // obvious: "search" must never be swallowed by the :id route.
  fastify.get("/search", async (request, reply) => {
    const query = searchQuerySchema.parse(request.query);
    const result = await searchListings(deps, query);
    return reply.status(200).send(ok(result.items, { nextCursor: result.nextCursor, limit: result.items.length }));
  });

  fastify.get("/", { preHandler: optionalAuthenticate }, async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    // "mine=true" is the owner dashboard's view of their own listings
    // (every status, not just ACTIVE) — requires an authenticated OWNER.
    const ownerId = query.mine ? requireOwner(request).id : undefined;
    const result = await listListings(deps, query, ownerId);
    return reply.status(200).send(ok(result.items, { nextCursor: result.nextCursor, limit: result.items.length }));
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getListing(deps, id);
    return reply.status(200).send(ok(result));
  });

  fastify.post("/", { preHandler: authenticate }, async (request, reply) => {
    const user = requireOwner(request);
    const body = createListingSchema.parse(request.body);
    const result = await createListing(deps, user.id, body);
    return reply.status(201).send(ok(result));
  });

  fastify.patch("/:id", { preHandler: authenticate }, async (request, reply) => {
    const user = requireOwner(request);
    const { id } = request.params as { id: string };
    const body = updateListingSchema.parse(request.body);
    const result = await updateListing(deps, user.id, id, body);
    return reply.status(200).send(ok(result));
  });

  fastify.delete("/:id", { preHandler: authenticate }, async (request, reply) => {
    const user = requireOwner(request);
    const { id } = request.params as { id: string };
    const result = await deleteListing(deps, user.id, id);
    return reply.status(200).send(ok(result));
  });

  // ── Rooms ────────────────────────────────────────────────────────────────
  // Public, like GET /listings/:id — the student-facing detail page needs the
  // room roster, and it isn't owner-private information.
  //
  // Unpaginated by design: a listing has tens of rooms, not thousands (capped
  // by config.maxRoomsPerListing), and B1's occupancy map needs every room at
  // once to be correct. Per-status counts for the legend are therefore
  // derivable client-side from a complete array — no summary in the envelope.
  fastify.get("/:id/rooms", async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await listRooms(deps, id);
    return reply.status(200).send(ok(items, { total: items.length }));
  });

  fastify.post("/:id/rooms", { preHandler: authenticate }, async (request, reply) => {
    const user = requireOwner(request);
    const { id } = request.params as { id: string };
    const body = createRoomSchema.parse(request.body);
    const result = await createRoom(deps, user.id, id, body);
    return reply.status(201).send(ok(result));
  });

  fastify.post("/:id/photos", { preHandler: authenticate }, async (request, reply) => {
    const user = requireOwner(request);
    const { id } = request.params as { id: string };

    const files: PhotoFile[] = [];
    for await (const part of request.files()) {
      files.push({ buffer: await part.toBuffer(), mimetype: part.mimetype });
    }

    const result = await addPhotos(deps, user.id, id, files);
    return reply.status(200).send(ok(result));
  });
};

export default listingRoutes;
