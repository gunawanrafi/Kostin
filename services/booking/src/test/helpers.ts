import jwt from "jsonwebtoken";
import { Prisma, type Booking, type Listing, type Room } from "@kostin/database";
import { buildApp } from "../app.js";
import type { BookingConfig } from "../config.js";
import type {
  BookingRepository,
  BookingStudentSummary,
  BookingWithContext,
  CreateBookingData,
  StatusUpdateData,
} from "../lib/booking-repository.js";
import type { AutoCancelJobData, BookingQueue } from "../lib/booking-queue.js";
import type { DocumentUploadResult, DocumentUploader } from "../lib/document-uploader.js";
import type { EscrowClient, HoldEscrowInput, HoldEscrowResult } from "../lib/escrow-client.js";
import { InMemoryRedis } from "../lib/redis.js";

export function testConfig(overrides: Partial<BookingConfig> = {}): BookingConfig {
  return {
    port: 0,
    host: "127.0.0.1",
    corsOrigin: "*",
    databaseUrl: "",
    redisUrl: "",
    jwtAccessSecret: "test_access_secret",
    escrowServiceUrl: "http://escrow.test",
    autoCancelDelayMs: 24 * 60 * 60 * 1000,
    draftTtlSec: 24 * 60 * 60,
    cloudinaryCloudName: "test-cloud",
    cloudinaryApiKey: "test-key",
    cloudinaryApiSecret: "test-secret",
    maxDocumentUploadBytes: 8 * 1024 * 1024,
    defaultPageSize: 20,
    maxPageSize: 50,
    ...overrides,
  };
}

// Hand-rolled multipart/form-data body — light-my-request (Fastify's inject())
// doesn't accept a FormData payload, so tests build the wire format directly.
export function buildMultipartBody(
  file: { filename: string; content: Buffer; contentType: string },
  fieldName = "file",
): { payload: Buffer; contentType: string } {
  const boundary = `----kostinTestBoundary${crypto.randomUUID().replace(/-/g, "")}`;
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${fieldName}"; filename="${file.filename}"\r\n` +
        `Content-Type: ${file.contentType}\r\n\r\n`,
    ),
    file.content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { payload, contentType: `multipart/form-data; boundary=${boundary}` };
}

export function signAccessToken(
  userId: string,
  role: string,
  secret: string = testConfig().jwtAccessSecret,
): string {
  return jwt.sign({ sub: userId, role, type: "access" }, secret, { expiresIn: "15m" });
}

export function makeListing(overrides: Partial<Listing> = {}): Listing {
  const now = new Date();
  return {
    id: "listing-1",
    ownerId: "owner-1",
    title: "Kost Nyaman Sumbersari",
    description: "Kost bersih dan nyaman dekat kampus.",
    address: "Jl. Sumbersari No. 1",
    kelurahan: "Sumbersari",
    kecamatan: "Lowokwaru",
    city: "Malang",
    lat: -7.9547,
    lng: 112.6147,
    type: "KOST_CAMPUR",
    pricePerMonth: new Prisma.Decimal(1500000),
    facilities: {},
    photos: [],
    amenities: ["wifi"],
    rules: [],
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

export function makeRoom(overrides: Partial<Room> = {}): Room {
  const now = new Date();
  return {
    id: "room-1",
    listingId: "listing-1",
    name: "Kamar A1",
    type: "STANDARD",
    pricePerMonth: new Prisma.Decimal(1200000),
    sizeSqm: 9,
    maxOccupants: 1,
    available: true,
    imageUrls: [],
    amenities: [],
    status: "AVAILABLE",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeBooking(overrides: Partial<Booking> = {}): Booking {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    listingId: "listing-1",
    roomId: null,
    studentId: "student-1",
    ownerId: "owner-1",
    checkIn: now,
    checkOut: now,
    durationMonths: 3,
    totalPrice: new Prisma.Decimal(4500000),
    status: "PENDING",
    notes: null,
    createdAt: now,
    updatedAt: now,
    ktmUrl: null,
    ktpUrl: null,
    confirmedAt: null,
    cancelledAt: null,
    cancelReason: null,
    ...overrides,
  };
}

export function makeStudent(overrides: Partial<BookingStudentSummary> = {}): BookingStudentSummary {
  return {
    id: "student-1",
    name: "Budi Mahasiswa",
    role: "STUDENT",
    status: "ACTIVE",
    avatarUrl: null,
    university: "Universitas Brawijaya",
    major: "Teknik Informatika",
    yearOfStudy: 2,
    ...overrides,
  };
}

// Stands in for the applicant used when a test seeds a booking whose
// studentId has no explicit `students` entry — the Prisma schema makes
// Booking.student a required relation, so a booking always has a real user
// behind it and the fake must not be able to produce one without.
const FALLBACK_STUDENT_NAME = "Mahasiswa Tanpa Profil";

// In-memory BookingRepository fake, backed by seed listings/rooms/bookings —
// mirrors the Prisma-backed implementation's lookups without touching Postgres.
export function createFakeBookingRepository(seed: {
  listings?: Listing[];
  rooms?: Room[];
  bookings?: Booking[];
  students?: BookingStudentSummary[];
} = {}): BookingRepository & { bookings: Booking[] } {
  const listings = [...(seed.listings ?? [])];
  const rooms = [...(seed.rooms ?? [])];
  const bookings = [...(seed.bookings ?? [])];
  const students = [...(seed.students ?? [])];

  const clone = <T>(v: T): T => ({ ...v });

  return {
    bookings,
    findById: async (id) => {
      const found = bookings.find((b) => b.id === id);
      return found ? clone(found) : null;
    },
    findListingForBooking: async (listingId) => {
      const found = listings.find((l) => l.id === listingId && !l.deletedAt);
      return found ? clone(found) : null;
    },
    findRoomForBooking: async (roomId) => {
      const found = rooms.find((r) => r.id === roomId);
      return found ? clone(found) : null;
    },
    create: async (input: CreateBookingData) => {
      const now = new Date();
      const booking: Booking = {
        id: crypto.randomUUID(),
        listingId: input.listingId,
        roomId: input.roomId,
        studentId: input.studentId,
        ownerId: input.ownerId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        durationMonths: input.durationMonths,
        totalPrice: new Prisma.Decimal(input.totalPrice),
        status: "PENDING",
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
        ktmUrl: null,
        ktpUrl: null,
        confirmedAt: null,
        cancelledAt: null,
        cancelReason: null,
      };
      bookings.push(booking);
      return clone(booking);
    },
    updateStatus: async (id, input: StatusUpdateData) => {
      const booking = bookings.find((b) => b.id === id);
      if (!booking) throw new Error("Booking not found");
      booking.status = input.status;
      if (input.confirmedAt !== undefined) booking.confirmedAt = input.confirmedAt;
      if (input.cancelledAt !== undefined) booking.cancelledAt = input.cancelledAt;
      if (input.cancelReason !== undefined) booking.cancelReason = input.cancelReason;
      booking.updatedAt = new Date();
      return clone(booking);
    },
    setDocumentUrl: async (id, documentType, url) => {
      const booking = bookings.find((b) => b.id === id);
      if (!booking) throw new Error("Booking not found");
      if (documentType === "KTM") booking.ktmUrl = url;
      else booking.ktpUrl = url;
      booking.updatedAt = new Date();
      return clone(booking);
    },
    findByScope: async (scope, filters, page, limit) => {
      const matching = bookings
        .filter((b) => (scope.ownerId !== undefined ? b.ownerId === scope.ownerId : true))
        .filter((b) => (scope.studentId !== undefined ? b.studentId === scope.studentId : true))
        .filter((b) => (filters.status !== undefined ? b.status === filters.status : true))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const start = (page - 1) * limit;

      // Mirrors the Prisma `include`: joins student/listing/room by id.
      const withContext: BookingWithContext[] = matching
        .slice(start, start + limit)
        .map((booking) => {
          const student =
            students.find((s) => s.id === booking.studentId) ??
            makeStudent({
              id: booking.studentId,
              name: FALLBACK_STUDENT_NAME,
              university: null,
              major: null,
              yearOfStudy: null,
            });
          const listing = listings.find((l) => l.id === booking.listingId);
          const room = booking.roomId ? rooms.find((r) => r.id === booking.roomId) : undefined;

          return {
            ...clone(booking),
            student: { ...student },
            listing: listing
              ? { id: listing.id, title: listing.title }
              : // Booking.listingId is a required FK, so a missing listing
                // can only mean the test seeded an inconsistent fixture.
                { id: booking.listingId, title: "Listing Tanpa Judul" },
            room: room ? { id: room.id, name: room.name } : null,
          };
        });

      return { items: withContext, total: matching.length };
    },
  };
}

export function createFakeBookingQueue(): BookingQueue & {
  scheduled: Map<string, AutoCancelJobData & { delayMs: number }>;
} {
  const scheduled = new Map<string, AutoCancelJobData & { delayMs: number }>();
  return {
    scheduled,
    scheduleAutoCancel: async (bookingId, delayMs) => {
      scheduled.set(bookingId, { bookingId, delayMs });
    },
    cancelAutoCancel: async (bookingId) => {
      scheduled.delete(bookingId);
    },
  };
}

export function createFakeEscrowClient(
  impl?: (input: HoldEscrowInput) => Promise<HoldEscrowResult>,
): EscrowClient & { calls: HoldEscrowInput[] } {
  const calls: HoldEscrowInput[] = [];
  return {
    calls,
    holdEscrow: async (input) => {
      calls.push(input);
      if (impl) return impl(input);
      return { escrowId: `escrow-${input.bookingId}`, status: "HOLDING" };
    },
  };
}

export function createFakeDocumentUploader(): DocumentUploader & {
  uploads: Array<{ bookingId: string; documentType: "KTM" | "KTP" }>;
} {
  const uploads: Array<{ bookingId: string; documentType: "KTM" | "KTP" }> = [];
  return {
    uploads,
    upload: async (_buffer: Buffer, bookingId: string, documentType: "KTM" | "KTP"): Promise<DocumentUploadResult> => {
      uploads.push({ bookingId, documentType });
      return { url: `https://res.cloudinary.com/test-cloud/image/upload/kostin/bookings/${bookingId}/documents/${documentType}.jpg` };
    },
  };
}

export interface TestDepsOverrides {
  config?: Partial<BookingConfig>;
  listings?: Listing[];
  rooms?: Room[];
  bookings?: Booking[];
  students?: BookingStudentSummary[];
  escrowImpl?: (input: HoldEscrowInput) => Promise<HoldEscrowResult>;
}

export function createTestDeps(overrides: TestDepsOverrides = {}) {
  return {
    config: testConfig(overrides.config),
    bookingRepository: createFakeBookingRepository({
      listings: overrides.listings,
      rooms: overrides.rooms,
      bookings: overrides.bookings,
      students: overrides.students,
    }),
    redis: new InMemoryRedis(),
    bookingQueue: createFakeBookingQueue(),
    escrowClient: createFakeEscrowClient(overrides.escrowImpl),
    documentUploader: createFakeDocumentUploader(),
  };
}

// Wires createTestDeps() straight into buildApp() with logging silenced, so
// each test file just does `const app = buildTestApp()` and gets a fully
// isolated Fastify instance backed by in-memory fakes.
export function buildTestApp(overrides: TestDepsOverrides = {}) {
  const deps = createTestDeps(overrides);
  const app = buildApp({ ...deps, logger: false });
  return { app, deps };
}
