// Local mirrors of the backend services' response DTOs. Dates cross JSON as
// ISO strings, not Date instances — kept as `string` here to match what
// actually arrives over the wire.

export type UserRole = "STUDENT" | "OWNER" | "ADMIN" | "PARENT";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface AuthResult {
  user: AuthUser;
  tokens: AuthTokens;
}

export type ListingTipe = "PUTRA" | "PUTRI" | "CAMPUR";
export type ListingStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "PENDING_REVIEW";
export type PaymentDuration = "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL";

export interface ListingDeposit {
  enabled: boolean;
  /** Null exactly when `enabled` is false. */
  amount: number | null;
}

// The five fixed rule toggles from design C5.
export interface HouseRules {
  access24Hours: boolean;
  overnightGuestsAllowed: boolean;
  oppositeGenderProhibited: boolean;
  petsProhibited: boolean;
  smokingProhibited: boolean;
}

export interface AdditionalFees {
  /** Null = not charged; 0 = charged but free. */
  extraOccupant: number | null;
  motorcycleParking: number | null;
  carParking: number | null;
}

export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  address: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  lat: number;
  lng: number;
  tipe: ListingTipe;
  pricePerMonth: number;
  facilities: Record<string, unknown>;
  photos: string[];
  amenities: string[];
  rules: string[];
  status: ListingStatus;
  deposit: ListingDeposit;
  paymentDuration: PaymentDuration;
  houseRules: HouseRules;
  additionalFees: AdditionalFees;
  createdAt: string;
  updatedAt: string;
  distanceKm?: number;
}

export type NotificationChannel = "PUSH" | "WHATSAPP" | "SMS" | "EMAIL" | "IN_APP";
export type NotificationStatus = "UNREAD" | "READ";

// The 5 events notification-service supports (see its validation.ts /
// NotificationEventType in the Prisma schema). `null` is legitimate — the
// column is nullable for notifications not created via POST /send.
export type NotificationEventType =
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "PAYMENT_SUCCESS"
  | "NEW_INQUIRY"
  | "OTP_REQUEST";

// Named AppNotification, not Notification: `Notification` is a lib.dom global
// (the Web Notifications API) and shadowing it module-locally reads as a bug.
export interface AppNotification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  eventType: NotificationEventType | null;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export type BookingStatus = "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

// The applicant behind a booking, embedded by booking-service's GET /bookings.
export interface BookingStudent {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  university: string | null;
  major: string | null;
  yearOfStudy: number | null;
  /** The account passed phone/OTP verification (users.status === ACTIVE).
   *  NOT identity/KYC verification — nothing in this platform reviews a
   *  KTM/KTP, so this must never be labelled "Identitas Terverifikasi". */
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

export interface Booking {
  id: string;
  listingId: string;
  roomId: string | null;
  studentId: string;
  ownerId: string;
  checkIn: string;
  checkOut: string;
  durationMonths: number;
  totalPrice: number;
  status: BookingStatus;
  notes: string | null;
  ktmUrl: string | null;
  ktpUrl: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;

  // Joined rows, present on GET /bookings only (the single-booking endpoints
  // still return a bare booking) — hence optional.
  student?: BookingStudent;
  listing?: BookingListingRef;
  room?: BookingRoomRef | null;
}

// GET /bookings guarantees the joins, so the list view narrows to this rather
// than null-checking `student` on every read.
export interface BookingWithContext extends Booking {
  student: BookingStudent;
  listing: BookingListingRef;
  room: BookingRoomRef | null;
}

// Owner screening preferences — mirrors user-service's screeningCriteriaSchema.
// Deliberately has no minimum-match-score field: scoring needs ai-service.
export interface ScreeningCriteria {
  minDurationMonths: number;
  requireVerifiedAccount: boolean;
  requireKtm: boolean;
  requireKtp: boolean;
  allowSmoking: boolean;
  allowPets: boolean;
  preferredUniversities: string[];
  notes: string;
}
