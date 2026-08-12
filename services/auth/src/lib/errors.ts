// Error codes returned in the `error.code` field of the { data, error, meta }
// envelope. Kept as a const object (not a TS enum) so the values are plain
// string literals both at compile time and at runtime.
export const AuthErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  USER_EXISTS: "USER_EXISTS",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  GOOGLE_TOKEN_INVALID: "GOOGLE_TOKEN_INVALID",
  OTP_INVALID: "OTP_INVALID",
  OTP_EXPIRED: "OTP_EXPIRED",
  OTP_RATE_LIMITED: "OTP_RATE_LIMITED",
  OTP_COOLDOWN: "OTP_COOLDOWN",
  RESET_CODE_INVALID: "RESET_CODE_INVALID",
  RESET_CODE_EXPIRED: "RESET_CODE_EXPIRED",
  RESET_RATE_LIMITED: "RESET_RATE_LIMITED",
  PASSWORD_NOT_SET: "PASSWORD_NOT_SET",
  PASSWORD_UNCHANGED: "PASSWORD_UNCHANGED",
  PASSWORD_CHANGE_RATE_LIMITED: "PASSWORD_CHANGE_RATE_LIMITED",
  UNAUTHORIZED: "UNAUTHORIZED",
  TOKEN_INVALID: "TOKEN_INVALID",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode];

// Thrown by service functions; caught by the Fastify error handler in app.ts
// and translated into the standard { data, error, meta } response shape.
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: AuthErrorCode;

  constructor(statusCode: number, code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}
