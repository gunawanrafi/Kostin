// Error codes returned in the `error.code` field of the { data, error, meta }
// envelope. Kept as a const object (not a TS enum) so the values are plain
// string literals both at compile time and at runtime.
export const NotificationErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type NotificationErrorCode = (typeof NotificationErrorCode)[keyof typeof NotificationErrorCode];

// Thrown by service functions; caught by the Fastify error handler in app.ts
// and translated into the standard { data, error, meta } response shape.
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: NotificationErrorCode;

  constructor(statusCode: number, code: NotificationErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}
