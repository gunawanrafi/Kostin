import type { Booking, BookingStatus, Listing, PrismaClient, Room } from "@kostin/database";

export interface CreateBookingData {
  listingId: string;
  roomId: string | null;
  studentId: string;
  ownerId: string;
  checkIn: Date;
  checkOut: Date;
  durationMonths: number;
  totalPrice: number;
  notes: string | null;
}

export interface StatusUpdateData {
  status: BookingStatus;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
}

// Exactly one of ownerId/studentId is set — resolved from the authenticated
// caller's role (OWNER sees bookings on their listings, STUDENT sees their
// own bookings), never both and never client-supplied.
export interface BookingListScope {
  ownerId?: string;
  studentId?: string;
}

export interface BookingListFilters {
  status?: BookingStatus;
}

export interface BookingListPage {
  items: Booking[];
  total: number;
}

// Narrow surface of Prisma actually needed by booking routes, so tests can
// inject an in-memory fake instead of hitting Postgres.
export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  findListingForBooking(listingId: string): Promise<Listing | null>;
  findRoomForBooking(roomId: string): Promise<Room | null>;
  create(input: CreateBookingData): Promise<Booking>;
  updateStatus(id: string, input: StatusUpdateData): Promise<Booking>;
  setDocumentUrl(id: string, documentType: "KTM" | "KTP", url: string): Promise<Booking>;
  findByScope(
    scope: BookingListScope,
    filters: BookingListFilters,
    page: number,
    limit: number,
  ): Promise<BookingListPage>;
}

export function createPrismaBookingRepository(prisma: PrismaClient): BookingRepository {
  return {
    findById: (id) => prisma.booking.findUnique({ where: { id } }),
    findListingForBooking: (listingId) =>
      prisma.listing.findFirst({ where: { id: listingId, deletedAt: null } }),
    findRoomForBooking: (roomId) => prisma.room.findUnique({ where: { id: roomId } }),

    create: (input) =>
      prisma.booking.create({
        data: {
          listingId: input.listingId,
          roomId: input.roomId,
          studentId: input.studentId,
          ownerId: input.ownerId,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          durationMonths: input.durationMonths,
          totalPrice: input.totalPrice,
          notes: input.notes,
        },
      }),

    updateStatus: (id, input) =>
      prisma.booking.update({
        where: { id },
        data: {
          status: input.status,
          ...(input.confirmedAt !== undefined ? { confirmedAt: input.confirmedAt } : {}),
          ...(input.cancelledAt !== undefined ? { cancelledAt: input.cancelledAt } : {}),
          ...(input.cancelReason !== undefined ? { cancelReason: input.cancelReason } : {}),
        },
      }),

    setDocumentUrl: (id, documentType, url) =>
      prisma.booking.update({
        where: { id },
        data: documentType === "KTM" ? { ktmUrl: url } : { ktpUrl: url },
      }),

    findByScope: async (scope, filters, page, limit) => {
      const where = {
        ...(scope.ownerId !== undefined ? { ownerId: scope.ownerId } : {}),
        ...(scope.studentId !== undefined ? { studentId: scope.studentId } : {}),
        ...(filters.status !== undefined ? { status: filters.status } : {}),
      };
      const [items, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.booking.count({ where }),
      ]);
      return { items, total };
    },
  };
}
