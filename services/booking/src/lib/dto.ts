import type { Booking, BookingStatus, UserRole } from "@kostin/database";
import type { BookingWithContext } from "./booking-repository.js";

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

// The applicant as the owner's screening list sees them.
export interface BookingStudent {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  university: string | null;
  major: string | null;
  yearOfStudy: number | null;

  // WHAT THIS IS: the account cleared phone/OTP verification (users.status ==
  // ACTIVE). WHAT IT IS NOT: identity (KYC) verification. Nothing in this
  // platform reviews a KTM/KTP — booking.ktmUrl/ktpUrl record that a file was
  // uploaded, and no human or service ever approves it. The two are reported
  // separately, and named for what they actually are, so the UI can't end up
  // showing "Identitas Terverifikasi" off an OTP check.
  accountVerified: boolean;
}

export interface BookingListingRef {
  id: string;
  title: string;
}

export interface BookingRoomRef {
  id: string;
  name: string;
}

// GET /bookings payload: the booking plus the joined rows needed to render a
// human-readable applicant card.
export interface PublicBookingWithContext extends PublicBooking {
  student: BookingStudent;
  listing: BookingListingRef;
  // Null when the booking is against the listing as a whole rather than a
  // specific room — the room is optional at creation time.
  room: BookingRoomRef | null;
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

export function toPublicBookingWithContext(booking: BookingWithContext): PublicBookingWithContext {
  return {
    ...toPublicBooking(booking),
    student: {
      id: booking.student.id,
      name: booking.student.name,
      role: booking.student.role,
      avatarUrl: booking.student.avatarUrl,
      university: booking.student.university,
      major: booking.student.major,
      yearOfStudy: booking.student.yearOfStudy,
      // SUSPENDED and PENDING_VERIFICATION both mean "not verified" here —
      // only ACTIVE is an affirmative signal.
      accountVerified: booking.student.status === "ACTIVE",
    },
    listing: booking.listing,
    room: booking.room,
  };
}
