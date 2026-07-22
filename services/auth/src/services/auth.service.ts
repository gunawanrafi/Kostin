import type { UserRole } from "@kostin/database";
import type { AuthConfig } from "../config.js";
import { AppError, AuthErrorCode } from "../lib/errors.js";
import { toPublicUser, type AuthResult, type AuthTokens } from "../lib/dto.js";
import type { GoogleVerifier } from "../lib/google.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenError } from "../lib/jwt.js";
import type { OtpSender } from "../lib/otp.js";
import { requestOtp, verifyOtp } from "../lib/otp-store.js";
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
