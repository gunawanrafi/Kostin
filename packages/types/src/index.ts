// --- API envelope -----------------------------------------------------------

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: ApiError | null;
  meta: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  requestId?: string;
  // Cursor-based pagination (e.g. GET /listings): present when more results
  // exist; pass it back as `?cursor=` to fetch the next page.
  nextCursor?: string | null;
}

// --- User -------------------------------------------------------------------

export type UserRole = "student" | "owner" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Listing ----------------------------------------------------------------

export type ListingStatus = "active" | "inactive" | "pending_review";

export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  pricePerMonth: number;
  imageUrls: string[];
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
}

// --- Booking ----------------------------------------------------------------

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled";

export interface Booking {
  id: string;
  listingId: string;
  studentId: string;
  ownerId: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

// --- Escrow -----------------------------------------------------------------

export type EscrowStatus = "held" | "released" | "refunded" | "disputed";

export interface Escrow {
  id: string;
  bookingId: string;
  amount: number;
  status: EscrowStatus;
  heldAt: Date;
  releasedAt?: Date;
}

// --- Payment ----------------------------------------------------------------

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  status: PaymentStatus;
  midtransOrderId?: string;
  paidAt?: Date;
  createdAt: Date;
}

// --- Review -----------------------------------------------------------------

export interface Review {
  id: string;
  bookingId: string;
  listingId: string;
  studentId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

// --- Notification -----------------------------------------------------------

export type NotificationChannel = "push" | "whatsapp" | "sms" | "email";

export interface NotificationPayload {
  userId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, string>;
}
