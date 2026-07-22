import type { Booking, BookingStatus } from "@kostin/database";

export interface PublicBooking {
  id: string;
  listingId: string;
  roomId: string | null;
  studentId: string;
  ownerId: string;
  checkIn: Date;
  checkOut: Date;
  durationMonths: number;
  totalPrice: number;
  status: BookingStatus;
  notes: string | null;
  ktmUrl: string | null;
  ktpUrl: string | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
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

export function toPublicBooking(booking: Booking): PublicBooking {
  return {
    id: booking.id,
    listingId: booking.listingId,
    roomId: booking.roomId,
    studentId: booking.studentId,
    ownerId: booking.ownerId,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    durationMonths: booking.durationMonths,
    totalPrice: toNumber(booking.totalPrice),
    status: booking.status,
    notes: booking.notes,
    ktmUrl: booking.ktmUrl,
    ktpUrl: booking.ktpUrl,
    confirmedAt: booking.confirmedAt,
    cancelledAt: booking.cancelledAt,
    cancelReason: booking.cancelReason,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}
