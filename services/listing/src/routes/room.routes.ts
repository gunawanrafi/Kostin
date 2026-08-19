import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { requireOwner } from "../lib/auth-plugin.js";
import { ok } from "../lib/response.js";
import { updateRoomSchema } from "../lib/validation.js";
import { deleteRoom, updateRoom } from "../services/room.service.js";
import type { ListingDeps } from "../services/listing.service.js";

export interface RoomRoutesOptions {
  deps: ListingDeps;
  authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

// Mounted at /rooms rather than under /listings/:id/rooms/:roomId — a room id
// is globally unique, so making the client carry the parent listing id just to
// edit one room would be redundant (and a second id the server would have to
// cross-check anyway). Ownership is still resolved through the parent listing;
// see room.service.ts's loadOwnedRoom.
//
// Both routes are owner-only: there is no public read of a single room, since
// GET /listings/:id/rooms already serves the whole roster.
const roomRoutes: FastifyPluginAsync<RoomRoutesOptions> = async (
  fastify: FastifyInstance,
  opts,
) => {
  const { deps, authenticate } = opts;

  fastify.patch("/:id", { preHandler: authenticate }, async (request, reply) => {
    const user = requireOwner(request);
    const { id } = request.params as { id: string };
    const body = updateRoomSchema.parse(request.body);
    const result = await updateRoom(deps, user.id, id, body);
    return reply.status(200).send(ok(result));
  });

  fastify.delete("/:id", { preHandler: authenticate }, async (request, reply) => {
    const user = requireOwner(request);
    const { id } = request.params as { id: string };
    const result = await deleteRoom(deps, user.id, id);
    return reply.status(200).send(ok(result));
  });
};

export default roomRoutes;
