import type { PrismaClient, Room, RoomStatus, RoomType } from "@kostin/database";

export interface CreateRoomData {
  listingId: string;
  name: string;
  type: RoomType;
  pricePerMonth: number;
  sizeSqm: number | null;
  maxOccupants: number;
  amenities: string[];
  imageUrls: string[];
  status: RoomStatus;
}

export interface UpdateRoomData {
  name?: string;
  type?: RoomType;
  pricePerMonth?: number;
  sizeSqm?: number | null;
  maxOccupants?: number;
  amenities?: string[];
  imageUrls?: string[];
  status?: RoomStatus;
}

// Narrow surface of Prisma actually needed by the room routes, so tests can
// inject an in-memory fake instead of hitting Postgres.
//
// Every read filters `deletedAt: null` — a soft-deleted room must be
// invisible to listing/detail/update alike, so callers can't accidentally
// resurrect one by id.
export interface RoomRepository {
  findById(id: string): Promise<Room | null>;
  findByListingId(listingId: string): Promise<Room[]>;
  countByListingId(listingId: string): Promise<number>;
  create(input: CreateRoomData): Promise<Room>;
  update(id: string, input: UpdateRoomData): Promise<Room>;
  softDelete(id: string): Promise<Room>;
}

export function createPrismaRoomRepository(prisma: PrismaClient): RoomRepository {
  return {
    findById: (id) => prisma.room.findFirst({ where: { id, deletedAt: null } }),

    // Stable ordering by name so B1's occupancy grid doesn't reshuffle between
    // loads; createdAt breaks ties for rooms sharing a name.
    findByListingId: (listingId) =>
      prisma.room.findMany({
        where: { listingId, deletedAt: null },
        orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      }),

    countByListingId: (listingId) => prisma.room.count({ where: { listingId, deletedAt: null } }),

    create: (input) => prisma.room.create({ data: input }),

    update: (id, input) => {
      // `sizeSqm: null` is a meaningful write (clearing the size), so the
      // checks are against `undefined` rather than truthiness.
      return prisma.room.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.pricePerMonth !== undefined ? { pricePerMonth: input.pricePerMonth } : {}),
          ...(input.sizeSqm !== undefined ? { sizeSqm: input.sizeSqm } : {}),
          ...(input.maxOccupants !== undefined ? { maxOccupants: input.maxOccupants } : {}),
          ...(input.amenities !== undefined ? { amenities: { set: input.amenities } } : {}),
          ...(input.imageUrls !== undefined ? { imageUrls: { set: input.imageUrls } } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
    },

    softDelete: (id) => prisma.room.update({ where: { id }, data: { deletedAt: new Date() } }),
  };
}
