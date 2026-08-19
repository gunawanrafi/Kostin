import { AppError, ListingErrorCode } from "../lib/errors.js";
import { toPublicRoom, type PublicRoom } from "../lib/room-dto.js";
import type { CreateRoomInput, UpdateRoomInput } from "../lib/validation.js";
import type { ListingDeps } from "./listing.service.js";

// Rooms belong to a listing, and a listing belongs to an owner — so every
// write is authorized against the PARENT LISTING's ownerId, never against
// anything on the room itself. Role (OWNER) is checked earlier by
// requireOwner() in the route; this is the per-resource check role can't cover.
async function loadOwnedListing(deps: ListingDeps, userId: string, listingId: string) {
  const listing = await deps.listingRepository.findById(listingId);
  if (!listing) throw new AppError(404, ListingErrorCode.NOT_FOUND, "Listing not found");
  if (listing.ownerId !== userId) {
    throw new AppError(403, ListingErrorCode.FORBIDDEN, "You do not own this listing");
  }
  return listing;
}

// Resolves a room to its parent listing and checks ownership in one step —
// used by the /rooms/:id routes, which have no listing id in the path.
//
// A room whose listing was soft-deleted is treated as not found: findById on
// the listing repository already filters deletedAt, so the room is
// unreachable rather than editable in limbo.
async function loadOwnedRoom(deps: ListingDeps, userId: string, roomId: string) {
  const room = await deps.roomRepository.findById(roomId);
  if (!room) throw new AppError(404, ListingErrorCode.NOT_FOUND, "Room not found");
  await loadOwnedListing(deps, userId, room.listingId);
  return room;
}

// Public, mirroring GET /listings/:id — the student-facing detail page needs
// the room list too, and a room roster is not owner-private information.
export async function listRooms(deps: ListingDeps, listingId: string): Promise<PublicRoom[]> {
  // 404 on an unknown/deleted listing rather than an empty array — "this
  // listing has no rooms" and "this listing does not exist" are different
  // answers, and the caller needs to tell them apart.
  const listing = await deps.listingRepository.findById(listingId);
  if (!listing) throw new AppError(404, ListingErrorCode.NOT_FOUND, "Listing not found");

  const rooms = await deps.roomRepository.findByListingId(listingId);
  return rooms.map(toPublicRoom);
}

export async function createRoom(
  deps: ListingDeps,
  userId: string,
  listingId: string,
  input: CreateRoomInput,
): Promise<PublicRoom> {
  await loadOwnedListing(deps, userId, listingId);

  const existing = await deps.roomRepository.countByListingId(listingId);
  if (existing >= deps.config.maxRoomsPerListing) {
    throw new AppError(
      400,
      ListingErrorCode.TOO_MANY_ROOMS,
      `A listing may have at most ${deps.config.maxRoomsPerListing} rooms (has ${existing})`,
    );
  }

  const room = await deps.roomRepository.create({
    listingId,
    name: input.name,
    type: input.type,
    pricePerMonth: input.pricePerMonth,
    sizeSqm: input.sizeSqm,
    maxOccupants: input.maxOccupants,
    amenities: input.amenities,
    imageUrls: input.imageUrls,
    status: input.status,
  });
  return toPublicRoom(room);
}

// Status is patched through here like any other field — B1's occupancy map is
// driven by it, and nothing else currently writes it. NOTE: booking-service
// does not yet move a room to BOOKED/OCCUPIED when a booking is confirmed or
// activated, so today this endpoint is the only writer. Wiring that
// transition is a follow-up; until then an owner maintains the map by hand.
export async function updateRoom(
  deps: ListingDeps,
  userId: string,
  roomId: string,
  input: UpdateRoomInput,
): Promise<PublicRoom> {
  await loadOwnedRoom(deps, userId, roomId);

  const updated = await deps.roomRepository.update(roomId, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.pricePerMonth !== undefined ? { pricePerMonth: input.pricePerMonth } : {}),
    // `null` clears the size, so this checks for undefined specifically.
    ...(input.sizeSqm !== undefined ? { sizeSqm: input.sizeSqm } : {}),
    ...(input.maxOccupants !== undefined ? { maxOccupants: input.maxOccupants } : {}),
    ...(input.amenities !== undefined ? { amenities: input.amenities } : {}),
    ...(input.imageUrls !== undefined ? { imageUrls: input.imageUrls } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
  });
  return toPublicRoom(updated);
}

export interface DeleteRoomResult {
  id: string;
  deletedAt: Date;
}

// Soft delete, mirroring deleteListing. Booking.roomId references rooms, so a
// hard delete would either orphan or cascade away booking history.
export async function deleteRoom(
  deps: ListingDeps,
  userId: string,
  roomId: string,
): Promise<DeleteRoomResult> {
  await loadOwnedRoom(deps, userId, roomId);
  const deleted = await deps.roomRepository.softDelete(roomId);
  return { id: deleted.id, deletedAt: deleted.deletedAt as Date };
}
