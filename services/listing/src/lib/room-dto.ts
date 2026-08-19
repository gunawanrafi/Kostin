import type { Room, RoomStatus, RoomType } from "@kostin/database";

// What crosses the wire for a room. `deletedAt` is deliberately absent —
// every read filters soft-deleted rows out, so a room the client can see is
// by definition not deleted.
export interface PublicRoom {
  id: string;
  listingId: string;
  name: string;
  type: RoomType;
  pricePerMonth: number;
  /** Null when the owner hasn't recorded a size. */
  sizeSqm: number | null;
  maxOccupants: number;
  amenities: string[];
  imageUrls: string[];
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Prisma's Decimal (decimal.js) — duck-typed rather than importing the
// Decimal class just for an instanceof check, same as lib/dto.ts.
function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

export function toPublicRoom(room: Room): PublicRoom {
  return {
    id: room.id,
    listingId: room.listingId,
    name: room.name,
    type: room.type,
    pricePerMonth: toNumber(room.pricePerMonth),
    sizeSqm: room.sizeSqm,
    maxOccupants: room.maxOccupants,
    amenities: room.amenities,
    imageUrls: room.imageUrls,
    status: room.status,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}
