import type { UserRole } from "@kostin/database";
import type { AuthConfig } from "../config.js";
import { AppError, AuthErrorCode } from "../lib/errors.js";
import { toPublicUser, type AuthResult, type AuthTokens } from "../lib/dto.js";
import type { GoogleVerifier } from "../lib/google.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenError } from "../lib/jwt.js";
import type { OtpSender } from "../lib/otp.js";
import { requestOtp, verifyOtp } from "../lib/otp-store.js";
import {
  assertPasswordChangeAllowed,
  clearPasswordChangeAttempts,
  recordFailedPasswordChange,
} from "../lib/password-change-store.js";
import { consumeResetCode, issueResetCode } from "../lib/password-reset-store.js";
import { normalizePhone } from "../lib/phone.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import type { RedisLike } from "../lib/redis.js";
import { isRefreshSessionValid, revokeRefreshSession, storeRefreshSession } from "../lib/refresh-store.js";
import type { UserRepository } from "../lib/user-repository.js";
import type {
  LoginGoogleInput,
  LoginInput,
  LogoutInput,
  OtpRequestInput,
  OtpVerifyInput,
  PasswordChangeInput,
  PasswordForgotInput,
  PasswordResetInput,
  RefreshInput,
  RegisterInput,
} from "../lib/validation.js";

export interface AuthDeps {
  config: AuthConfig;
  userRepository: UserRepository;
  redis: RedisLike;
  otpSender: OtpSender;
  googleVerifier: GoogleVerifier;
}

async function issueTokens(deps: AuthDeps, userId: string, role: UserRole): Promise<AuthTokens> {
  const { config, redis } = deps;
  const jti = crypto.randomUUID();

  const accessToken = signAccessToken(userId, role, config.jwtAccessSecret, config.accessTokenTtlSec);
  const refreshToken = signRefreshToken(userId, jti, config.jwtRefreshSecret, config.refreshTokenTtlSec);
  await storeRefreshSession(redis, userId, jti, config.refreshTokenTtlSec);

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresIn: config.accessTokenTtlSec,
  };
}

export async function registerUser(deps: AuthDeps, input: RegisterInput): Promise<AuthResult> {
  const phone = normalizePhone(input.phone);
  const existing = await deps.userRepository.findByEmailOrPhone(input.email, phone);
  if (existing) {
    throw new AppError(409, AuthErrorCode.USER_EXISTS, "An account with this email or phone already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await deps.userRepository.create({
    name: input.name,
    email: input.email,
    phone,
    role: input.role,
    passwordHash,
  });

  const tokens = await issueTokens(deps, user.id, user.role);
  return { user: toPublicUser(user), tokens };
}

export async function loginUser(deps: AuthDeps, input: LoginInput): Promise<AuthResult> {
  const identifier = input.identifier.trim();
  const isEmail = identifier.includes("@");
  const user = isEmail
    ? await deps.userRepository.findByEmail(identifier.toLowerCase())
    : await deps.userRepository.findByPhone(normalizePhone(identifier));

  // Same error for "no such user" and "wrong password" — avoids leaking
  // account existence to an unauthenticated caller.
  if (!user?.passwordHash) {
    throw new AppError(401, AuthErrorCode.INVALID_CREDENTIALS, "Invalid email/phone or password");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, AuthErrorCode.INVALID_CREDENTIALS, "Invalid email/phone or password");
  }

  const tokens = await issueTokens(deps, user.id, user.role);
  return { user: toPublicUser(user), tokens };
}

export async function loginWithGoogle(deps: AuthDeps, input: LoginGoogleInput): Promise<AuthResult> {
  const profile = await deps.googleVerifier.verifyIdToken(input.idToken);

  let user = await deps.userRepository.findByGoogleId(profile.googleId);

  if (!user) {
    // Link by email if the address already has a password-based account,
    // otherwise provision a fresh Google-only account.
    const byEmail = await deps.userRepository.findByEmail(profile.email);
    user = byEmail
      ? await deps.userRepository.linkGoogleId(byEmail.id, profile.googleId)
      : await deps.userRepository.create({
          name: profile.name,
          email: profile.email,
          // Google doesn't provide a phone number; a real onboarding flow
          // would collect+verify it via /auth/otp afterward. A unique
          // placeholder keeps the NOT NULL/UNIQUE phone constraint satisfied.
          phone: `google:${profile.googleId}`,
          role: "STUDENT",
          googleId: profile.googleId,
        });
  }

  const tokens = await issueTokens(deps, user.id, user.role);
  return { user: toPublicUser(user), tokens };
}

export async function requestOtpForPhone(
  deps: AuthDeps,
  input: OtpRequestInput,
): Promise<{ phone: string; expiresInSec: number }> {
  const phone = normalizePhone(input.phone);
  const { expiresInSec } = await requestOtp(deps.redis, deps.otpSender, phone, deps.config);
  return { phone, expiresInSec };
}

// OTP verification proves phone ownership for an account that already
// exists (created via /auth/register or /auth/login/google). Users can't be
// created from a phone number alone because `email` is a required, unique
// column — so an unrecognized phone here means "register first."
export async function verifyOtpAndIssueTokens(
  deps: AuthDeps,
  input: OtpVerifyInput,
): Promise<AuthResult> {
  const phone = normalizePhone(input.phone);
  await verifyOtp(deps.redis, phone, input.code, deps.config);

  let user = await deps.userRepository.findByPhone(phone);
  if (!user) {
    throw new AppError(404, AuthErrorCode.NOT_FOUND, "No account found for this phone number");
  }
  if (user.status === "PENDING_VERIFICATION") {
    user = await deps.userRepository.activate(user.id);
  }

  const tokens = await issueTokens(deps, user.id, user.role);
  return { user: toPublicUser(user), tokens };
}

export async function refreshTokens(deps: AuthDeps, input: RefreshInput): Promise<AuthTokens> {
  let payload;
  try {
    payload = verifyRefreshToken(input.refreshToken, deps.config.jwtRefreshSecret);
  } catch (err) {
    if (err instanceof TokenError) {
      throw new AppError(401, AuthErrorCode.TOKEN_INVALID, "Invalid or expired refresh token");
    }
    throw err;
  }

  const valid = await isRefreshSessionValid(deps.redis, payload.sub, payload.jti);
  if (!valid) {
    throw new AppError(401, AuthErrorCode.TOKEN_INVALID, "Refresh token has been revoked");
  }

  const user = await deps.userRepository.findById(payload.sub);
  if (!user) {
    throw new AppError(401, AuthErrorCode.TOKEN_INVALID, "User no longer exists");
  }

  // Rotate: burn the presented refresh token so it can't be replayed, then
  // issue a fresh access+refresh pair.
  await revokeRefreshSession(deps.redis, payload.sub, payload.jti);
  return issueTokens(deps, user.id, user.role);
}

export async function logoutUser(deps: AuthDeps, input: LogoutInput): Promise<void> {
  try {
    const payload = verifyRefreshToken(input.refreshToken, deps.config.jwtRefreshSecret);
    await revokeRefreshSession(deps.redis, payload.sub, payload.jti);
  } catch (err) {
    // Logout is idempotent: an already-invalid/expired/malformed refresh
    // token still results in "not logged in", which is the caller's goal.
    if (!(err instanceof TokenError)) throw err;
  }
}

// ── Password reset (A5 → A6 → A7) ──────────────────────────────────────────
//
// DELIVERY: this project has no email transport of any kind — no SMTP, no
// SendGrid/Resend, and notification-service sends FCM push only. The reset
// code is therefore delivered over the one channel that actually exists: the
// OTP sender (Twilio WhatsApp), addressed to the phone registered on the
// account the email belongs to. With no Twilio credentials configured, the
// ConsoleOtpSender logs the code to the server output instead of pretending
// anything was delivered.
//
// The response is deliberately identical whether or not the email matches an
// account, so this endpoint cannot be used to enumerate registered users.
// `channel` is a constant, not a per-user fact, so it leaks nothing.
export async function requestPasswordReset(
  deps: AuthDeps,
  input: PasswordForgotInput,
): Promise<{ channel: "whatsapp"; expiresInSec: number }> {
  const user = await deps.userRepository.findByEmail(input.email);

  if (user) {
    const issued = await issueResetCode(deps.redis, input.email, deps.config);
    // null => cooldown still active; deliberately still answered as success
    // (see issueResetCode) so repeat calls stay indistinguishable.
    if (issued) {
      await deps.otpSender.sendWhatsappOtp(user.phone, issued.code);
    }
  }

  return { channel: "whatsapp", expiresInSec: deps.config.otpTtlSec };
}

// Verifies the reset code and replaces the password hash. Accounts created
// via Google (passwordHash === null) are allowed through — this sets a
// password for the first time, which is the same operation.
export async function resetPassword(
  deps: AuthDeps,
  input: PasswordResetInput,
): Promise<{ success: true }> {
  // Code check runs first. For an unknown email there is no stored code, so
  // this throws RESET_CODE_EXPIRED — the same error a stale code produces,
  // keeping unknown addresses indistinguishable from expired ones.
  await consumeResetCode(deps.redis, input.email, input.code, deps.config);

  const user = await deps.userRepository.findByEmail(input.email);
  if (!user) {
    // Only reachable if the account was deleted between request and reset.
    throw new AppError(410, AuthErrorCode.RESET_CODE_EXPIRED, "Reset code is no longer valid");
  }

  const passwordHash = await hashPassword(input.newPassword);
  await deps.userRepository.updatePassword(user.id, passwordHash);

  // NOTE: existing refresh sessions are intentionally NOT revoked here.
  // refresh-store keys sessions per-jti (`refresh:<userId>:<jti>`) and
  // RedisLike exposes no scan/keys, so there is no way to enumerate a user's
  // sessions without widening that interface. Worth doing as a follow-up:
  // after a reset the old sessions arguably should be killed.
  return { success: true };
}

// Signed-in password change (Pengaturan → Keamanan). Distinct from the reset
// flow above: the credential proving it's really you is the *current
// password*, not a code delivered out-of-band, so no OTP is sent and the
// user's phone is never involved.
//
// `userId` comes from the verified access token (see lib/auth-plugin.ts), not
// from the request body — a caller can therefore only ever change their own
// password, whatever they put in the payload.
export async function changePassword(
  deps: AuthDeps,
  userId: string,
  input: PasswordChangeInput,
): Promise<{ success: true }> {
  const user = await deps.userRepository.findById(userId);
  if (!user) {
    // Valid signature, deleted account — same shape refreshTokens uses.
    throw new AppError(401, AuthErrorCode.TOKEN_INVALID, "User no longer exists");
  }

  if (!user.passwordHash) {
    // Google-only account: there is no current password to confirm, so this
    // operation has no honest meaning. Setting a first password is what the
    // reset flow does (it accepts a null hash), and it verifies ownership via
    // the WhatsApp code — so point there rather than letting a bare session
    // mint a password out of nothing.
    throw new AppError(
      409,
      AuthErrorCode.PASSWORD_NOT_SET,
      "This account signs in with Google and has no password yet. Use the password reset flow to set one.",
    );
  }

  // Checked before bcrypt runs, so a locked-out caller costs nothing.
  await assertPasswordChangeAllowed(deps.redis, userId, deps.config);

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) {
    await recordFailedPasswordChange(deps.redis, userId, deps.config);
    throw new AppError(401, AuthErrorCode.INVALID_CREDENTIALS, "Current password is incorrect");
  }

  // Compared against the hash rather than the two plaintexts, so it also
  // catches "new password equals current" when they differ only by what the
  // client sent (and works regardless of how the current one was set).
  if (await verifyPassword(input.newPassword, user.passwordHash)) {
    throw new AppError(
      400,
      AuthErrorCode.PASSWORD_UNCHANGED,
      "New password must be different from the current one",
    );
  }

  const passwordHash = await hashPassword(input.newPassword);
  await deps.userRepository.updatePassword(user.id, passwordHash);
  await clearPasswordChangeAttempts(deps.redis, userId);

  // Same caveat as resetPassword: other sessions survive this change, because
  // RedisLike can't enumerate a user's refresh jtis. The caller's own session
  // is deliberately left intact either way — they stay signed in on this
  // device after changing their password.
  return { success: true };
}
