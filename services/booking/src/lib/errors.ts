// Error codes returned in the `error.code` field of the { data, error, meta }
// envelope. Kept as a const object (not a TS enum) so the values are plain
// string literals both at compile time and at runtime.
export const BookingErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  LISTING_NOT_BOOKABLE: "LISTING_NOT_BOOKABLE",
  ROOM_NOT_AVAILABLE: "ROOM_NOT_AVAILABLE",
  SELF_BOOKING: "SELF_BOOKING",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  ESCROW_UNAVAILABLE: "ESCROW_UNAVAILABLE",
  INVALID_FILE: "INVALID_FILE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type BookingErrorCode = (typeof BookingErrorCode)[keyof typeof BookingErrorCode];

// Thrown by service functions; caught by the Fastify error handler in app.ts
// and translated into the standard { data, error, meta } response shape.
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: BookingErrorCode;

  constructor(statusCode: number, code: BookingErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}
