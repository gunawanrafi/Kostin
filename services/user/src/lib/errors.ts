// Error codes returned in the `error.code` field of the { data, error, meta }
// envelope. Kept as a const object (not a TS enum) so the values are plain
// string literals both at compile time and at runtime.
export const UserErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  INVALID_FILE: "INVALID_FILE",
  INVITE_ALREADY_PENDING: "INVITE_ALREADY_PENDING",
  INVITE_INVALID_TARGET: "INVITE_INVALID_TARGET",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type UserErrorCode = (typeof UserErrorCode)[keyof typeof UserErrorCode];

// Thrown by service functions; caught by the Fastify error handler in app.ts
// and translated into the standard { data, error, meta } response shape.
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: UserErrorCode;

  constructor(statusCode: number, code: UserErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}
