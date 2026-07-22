import type { AuthenticatedUser } from "../lib/auth-plugin.js";
import type { BookingConfig } from "../config.js";
import type {
  BookingListFilters,
  BookingListScope,
  BookingRepository,
} from "../lib/booking-repository.js";
import type { BookingQueue } from "../lib/booking-queue.js";
import { addMonths } from "../lib/date.js";
import { clearDraft, getDraft, saveDraft, type StoredDraft } from "../lib/draft-store.js";
import type { DocumentUploader } from "../lib/document-uploader.js";
import { toPublicBooking, type PublicBooking } from "../lib/dto.js";
import type { EscrowClient } from "../lib/escrow-client.js";
import { AppError, BookingErrorCode } from "../lib/errors.js";
import type { RedisLike } from "../lib/redis.js";
import { canCancel, canConfirm } from "../lib/status-machine.js";
import type { BookingDraftInput, CreateBookingInput, ListBookingsQueryInput } from "../lib/validation.js";

export interface BookingDeps {
  config: BookingConfig;
  bookingRepository: BookingRepository;
  redis: RedisLike;
  bookingQueue: BookingQueue;
  escrowClient: EscrowClient;
  documentUploader: DocumentUploader;
}

export interface DocumentFile {
  buffer: Buffer;
  mimetype: string;
}

// Prisma's Decimal (decimal.js) — guard with a duck-type check rather than
// importing the Decimal class just for an instanceof check.
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

export async function createBooking(
  deps: BookingDeps,
  studentId: string,
  input: CreateBookingInput,
): Promise<PublicBooking> {
  const listing = await deps.bookingRepository.findListingForBooking(input.listingId);
  if (!listing) throw new AppError(404, BookingErrorCode.NOT_FOUND, "Listing not found");
  if (listing.status !== "ACTIVE") {
    throw new AppError(409, BookingErrorCode.LISTING_NOT_BOOKABLE, "This listing is not currently accepting bookings");
  }
  if (listing.ownerId === studentId) {
    throw new AppError(400, BookingErrorCode.SELF_BOOKING, "You cannot book your own listing");
  }

  let pricePerMonth = toNumber(listing.pricePerMonth);
  let roomId: string | null = null;
  if (input.roomId) {
    const room = await deps.bookingRepository.findRoomForBooking(input.roomId);
    if (!room || room.listingId !== input.listingId) {
      throw new AppError(404, BookingErrorCode.NOT_FOUND, "Room not found for this listing");
    }
    if (!room.available || room.status !== "AVAILABLE") {
      throw new AppError(409, BookingErrorCode.ROOM_NOT_AVAILABLE, "This room is not currently available");
    }
    pricePerMonth = toNumber(room.pricePerMonth);
    roomId = room.id;
  }

  const checkOut = addMonths(input.checkIn, input.durationMonths);
  const totalPrice = pricePerMonth * input.durationMonths;

  const booking = await deps.bookingRepository.create({
    listingId: input.listingId,
    roomId,
    studentId,
    ownerId: listing.ownerId,
    checkIn: input.checkIn,
    checkOut,
    durationMonths: input.durationMonths,
    totalPrice,
    notes: input.notes ?? null,
  });

  // Requirement: auto-cancel if the owner doesn't confirm within 24h.
  await deps.bookingQueue.scheduleAutoCancel(booking.id, deps.config.autoCancelDelayMs);
  // The flow just completed successfully — any in-progress draft for this
  // listing is now stale.
  await clearDraft(deps.redis, studentId, input.listingId);

  return toPublicBooking(booking);
}

export interface ListBookingsResult {
  items: PublicBooking[];
  page: number;
  limit: number;
  total: number;
}

// OWNER sees bookings on their listings; every other role (STUDENT in
// practice) sees their own bookings. Scope is derived from the
// authenticated caller only — never client-supplied — so a student can't
// query another student's bookings by passing a different id.
export async function listBookings(
  deps: BookingDeps,
  user: AuthenticatedUser,
  query: ListBookingsQueryInput,
): Promise<ListBookingsResult> {
  const scope: BookingListScope = user.role === "OWNER" ? { ownerId: user.id } : { studentId: user.id };
  const filters: BookingListFilters = { ...(query.status !== undefined ? { status: query.status } : {}) };
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? deps.config.defaultPageSize, deps.config.maxPageSize);

  const { items, total } = await deps.bookingRepository.findByScope(scope, filters, page, limit);
  return { items: items.map(toPublicBooking), page, limit, total };
}

export async function getBooking(deps: BookingDeps, userId: string, bookingId: string): Promise<PublicBooking> {
  const booking = await deps.bookingRepository.findById(bookingId);
  if (!booking) throw new AppError(404, BookingErrorCode.NOT_FOUND, "Booking not found");
  if (booking.studentId !== userId && booking.ownerId !== userId) {
    throw new AppError(403, BookingErrorCode.FORBIDDEN, "You do not have access to this booking");
  }
  return toPublicBooking(booking);
}

export async function confirmBooking(
  deps: BookingDeps,
  ownerId: string,
  bookingId: string,
): Promise<PublicBooking> {
  const booking = await deps.bookingRepository.findById(bookingId);
  if (!booking) throw new AppError(404, BookingErrorCode.NOT_FOUND, "Booking not found");
  if (booking.ownerId !== ownerId) {
    throw new AppError(403, BookingErrorCode.FORBIDDEN, "Only the listing owner can confirm this booking");
  }
  if (!canConfirm(booking.status)) {
    throw new AppError(
      409,
      BookingErrorCode.INVALID_STATUS_TRANSITION,
      `Cannot confirm a booking with status ${booking.status}`,
    );
  }

  // Escrow must succeed BEFORE we commit the status change — a booking must
  // never read CONFIRMED without the corresponding funds actually held.
  await deps.escrowClient.holdEscrow({ bookingId: booking.id, amount: toNumber(booking.totalPrice) });

  const updated = await deps.bookingRepository.updateStatus(bookingId, {
    status: "CONFIRMED",
    confirmedAt: new Date(),
  });
  // No longer PENDING — stop the 24h auto-cancel timer.
  await deps.bookingQueue.cancelAutoCancel(bookingId);

  return toPublicBooking(updated);
}

export async function cancelBooking(deps: BookingDeps, userId: string, bookingId: string): Promise<PublicBooking> {
  const booking = await deps.bookingRepository.findById(bookingId);
  if (!booking) throw new AppError(404, BookingErrorCode.NOT_FOUND, "Booking not found");

  const isStudent = booking.studentId === userId;
  const isOwner = booking.ownerId === userId;
  if (!isStudent && !isOwner) {
    throw new AppError(403, BookingErrorCode.FORBIDDEN, "You do not have access to this booking");
  }
  if (!canCancel(booking.status)) {
    throw new AppError(
      409,
      BookingErrorCode.INVALID_STATUS_TRANSITION,
      `Cannot cancel a booking with status ${booking.status}`,
    );
  }

  const updated = await deps.bookingRepository.updateStatus(bookingId, {
    status: "CANCELLED",
    cancelledAt: new Date(),
    cancelReason: isStudent ? "STUDENT_CANCELLED" : "OWNER_CANCELLED",
  });
  await deps.bookingQueue.cancelAutoCancel(bookingId);

  return toPublicBooking(updated);
}

export async function uploadDocument(
  deps: BookingDeps,
  studentId: string,
  bookingId: string,
  documentType: "KTM" | "KTP",
  file: DocumentFile,
): Promise<PublicBooking> {
  const booking = await deps.bookingRepository.findById(bookingId);
  if (!booking) throw new AppError(404, BookingErrorCode.NOT_FOUND, "Booking not found");
  if (booking.studentId !== studentId) {
    throw new AppError(403, BookingErrorCode.FORBIDDEN, "Only the student who made this booking can upload documents");
  }
  if (!file.mimetype.startsWith("image/") && file.mimetype !== "application/pdf") {
    throw new AppError(400, BookingErrorCode.INVALID_FILE, `Unsupported file type: ${file.mimetype}`);
  }

  const uploaded = await deps.documentUploader.upload(file.buffer, bookingId, documentType);
  const updated = await deps.bookingRepository.setDocumentUrl(bookingId, documentType, uploaded.url);
  return toPublicBooking(updated);
}

export async function saveBookingDraft(
  deps: BookingDeps,
  userId: string,
  listingId: string,
  input: BookingDraftInput,
): Promise<StoredDraft> {
  return saveDraft(deps.redis, userId, listingId, input, deps.config.draftTtlSec);
}

export async function getBookingDraft(
  deps: BookingDeps,
  userId: string,
  listingId: string,
): Promise<StoredDraft> {
  const draft = await getDraft(deps.redis, userId, listingId);
  if (!draft) throw new AppError(404, BookingErrorCode.NOT_FOUND, "No saved draft for this listing");
  return draft;
}
