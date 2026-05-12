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

// Enums — re-exported so services import from @kostin/database, not @prisma/client
export {
  UserRole,
  UserStatus,
  ListingStatus,
  RoomType,
  RoomStatus,
  BookingStatus,
  EscrowStatus,
  PaymentStatus,
  PaymentProvider,
  NotificationChannel,
  NotificationStatus,
  PointsTransactionType,
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
} from "@prisma/client";
