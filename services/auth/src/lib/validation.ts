import { z } from "zod";

// Loose but real E.164-ish check; normalizePhone() handles local (0xxx) and
// bare (62xxx) formats before this runs against the persisted/lookup value.
const phoneSchema = z.string().min(8).max(20).regex(/^[0-9+\-\s()]+$/, "Invalid phone number");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: phoneSchema,
  password: passwordSchema,
  role: z.enum(["STUDENT", "OWNER"]).optional().default("STUDENT"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// email/phone + password — accepts either identifier in a single `identifier`
// field so the client doesn't need to know in advance which one it has.
export const loginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const loginGoogleSchema = z.object({
  idToken: z.string().min(10),
});
export type LoginGoogleInput = z.infer<typeof loginGoogleSchema>;

export const otpRequestSchema = z.object({
  phone: phoneSchema,
});
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "OTP code must be 6 digits"),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const logoutSchema = z.object({
  refreshToken: z.string().min(10),
});
export type LogoutInput = z.infer<typeof logoutSchema>;
