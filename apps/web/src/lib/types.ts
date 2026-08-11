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
}
