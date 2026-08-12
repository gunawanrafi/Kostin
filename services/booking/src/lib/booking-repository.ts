import type { Booking, BookingStatus, Listing, PrismaClient, Room, UserRole, UserStatus } from "@kostin/database";

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

// The applicant behind a booking, as the owner's Calon Penyewa list needs to
// see them. Deliberately a hand-picked subset of User/UserProfile rather than
// the whole rows: email and phone are contact details the screening list has
// no use for, and passwordHash/googleId must never leave auth-service's table.
export interface BookingStudentSummary {
  id: string;
  name: string;
  role: UserRole;
  // Account-level verification only — see toBookingStudent() in dto.ts for
  // what this does and does not mean.
  status: UserStatus;
  avatarUrl: string | null;
  university: string | null;
  major: string | null;
  yearOfStudy: number | null;
}

export interface BookingListingSummary {
  id: string;
  title: string;
}

export interface BookingRoomSummary {
  id: string;
  name: string;
}

// A booking joined with the rows the list view has to render. Only findByScope
// returns this — the single-booking lookups still return a bare Booking,
// because nothing displays a name off them yet.
export type BookingWithContext = Booking & {
  student: BookingStudentSummary;
  listing: BookingListingSummary;
  room: BookingRoomSummary | null;
};

export interface BookingListPage {
  items: BookingWithContext[];
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

    // Joins the applicant, listing, and room in the same query. A single
    // findMany with `include` rather than a follow-up batch lookup: these
    // tables live in the same Postgres database and Prisma emits one round
    // trip per relation, so there is no service boundary to cross and no
    // N+1 to avoid. (A `GET /users?ids=` batch endpoint on user-service would
    // be the answer if the data were actually in a separate database.)
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
          include: {
            // `select` inside each include, not the whole row: the applicant's
            // email/phone and the listing's full body have no business in a
            // list payload.
            student: {
              select: {
                id: true,
                name: true,
                role: true,
                status: true,
                avatarUrl: true,
                profile: { select: { university: true, major: true, yearOfStudy: true } },
              },
            },
            listing: { select: { id: true, title: true } },
            room: { select: { id: true, name: true } },
          },
        }),
        prisma.booking.count({ where }),
      ]);

      // Flatten the optional profile onto the student summary so callers get
      // one shape whether or not the applicant ever filled a profile in.
      const contextual: BookingWithContext[] = items.map(({ student, listing, room, ...booking }) => ({
        ...booking,
        student: {
          id: student.id,
          name: student.name,
          role: student.role,
          status: student.status,
          avatarUrl: student.avatarUrl,
          university: student.profile?.university ?? null,
          major: student.profile?.major ?? null,
          yearOfStudy: student.profile?.yearOfStudy ?? null,
        },
        listing: { id: listing.id, title: listing.title },
        room: room ? { id: room.id, name: room.name } : null,
      }));

      return { items: contextual, total };
    },
  };
}
