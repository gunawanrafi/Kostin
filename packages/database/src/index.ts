import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient } from "@prisma/client";
// Value export (not `export type`) — services need the runtime `Prisma`
// namespace too (Prisma.sql / Prisma.join for raw queries), not just types.
export { Prisma } from "@prisma/client";

// Enums — re-exported so services import from @kostin/database, not @prisma/client
export {
  UserRole,
  UserStatus,
  ListingStatus,
  KostType,
  PaymentDuration,
  RoomType,
  RoomStatus,
  BookingStatus,
  EscrowStatus,
  PaymentStatus,
  PaymentProvider,
  NotificationChannel,
  NotificationStatus,
  NotificationEventType,
  PointsTransactionType,
  ParentInviteStatus,
} from "@prisma/client";

// Types — Prisma model types for use across services
export type {
  User,
  UserProfile,
  Listing,
  Room,
  Booking,
  Escrow,
  Payment,
  Review,
  ChatRoom,
  ChatRoomMember,
  ChatMessage,
  Notification,
  KostInPoints,
  KostInPointsTransaction,
  ParentInvite,
} from "@prisma/client";
