import type { UserConfig } from "../config.js";
import { AppError, UserErrorCode } from "../lib/errors.js";
import { toPublicUser, type PublicUser } from "../lib/dto.js";
import type { AvatarUploader } from "../lib/avatar-uploader.js";
import type { ParentInviteRepository } from "../lib/parent-invite-repository.js";
import type { UpdateMeInput, UserRepository } from "../lib/user-repository.js";
import type { InviteParentInput, LifestyleInput } from "../lib/validation.js";

export interface UserDeps {
  config: UserConfig;
  userRepository: UserRepository;
  parentInviteRepository: ParentInviteRepository;
  avatarUploader: AvatarUploader;
}

async function loadPublicUser(deps: UserDeps, userId: string): Promise<PublicUser> {
  const user = await deps.userRepository.findById(userId);
  if (!user) {
    throw new AppError(404, UserErrorCode.NOT_FOUND, "User not found");
  }
  const profile = await deps.userRepository.findProfileByUserId(userId);
  return toPublicUser(user, profile);
}

export async function getMe(deps: UserDeps, userId: string): Promise<PublicUser> {
  return loadPublicUser(deps, userId);
}

export async function updateMe(deps: UserDeps, userId: string, input: UpdateMeInput): Promise<PublicUser> {
  const existing = await deps.userRepository.findById(userId);
  if (!existing) {
    throw new AppError(404, UserErrorCode.NOT_FOUND, "User not found");
  }

  const { user, profile } = await deps.userRepository.updateMe(userId, input);
  return toPublicUser(user, profile);
}

export interface AvatarUploadInput {
  buffer: Buffer;
  mimetype: string;
}

const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export async function updateAvatar(
  deps: UserDeps,
  userId: string,
  input: AvatarUploadInput,
): Promise<PublicUser> {
  if (!ALLOWED_AVATAR_MIME_TYPES.has(input.mimetype)) {
    throw new AppError(
      400,
      UserErrorCode.INVALID_FILE,
      "Avatar must be a JPEG, PNG, or WebP image",
    );
  }
  if (input.buffer.byteLength === 0) {
    throw new AppError(400, UserErrorCode.INVALID_FILE, "Avatar file is empty");
  }
  if (input.buffer.byteLength > MAX_AVATAR_BYTES) {
    throw new AppError(400, UserErrorCode.INVALID_FILE, "Avatar must be 5MB or smaller");
  }

  const existing = await deps.userRepository.findById(userId);
  if (!existing) {
    throw new AppError(404, UserErrorCode.NOT_FOUND, "User not found");
  }

  const { url } = await deps.avatarUploader.upload(input.buffer, userId);
  const user = await deps.userRepository.updateAvatarUrl(userId, url);
  const profile = await deps.userRepository.findProfileByUserId(userId);
  return toPublicUser(user, profile);
}

export async function updateLifestyle(
  deps: UserDeps,
  userId: string,
  input: LifestyleInput,
): Promise<PublicUser> {
  const existing = await deps.userRepository.findById(userId);
  if (!existing) {
    throw new AppError(404, UserErrorCode.NOT_FOUND, "User not found");
  }

  await deps.userRepository.updateLifestyle(userId, input);
  return loadPublicUser(deps, userId);
}

export interface ParentInviteResult {
  inviteId: string;
  token: string;
  expiresAt: Date;
}

// Only STUDENTs have parents to invite; the invite record itself is created
// here, but actually notifying the parent (email/WhatsApp) is out of scope
// for this service and would be dispatched via notification-service.
export async function inviteParent(
  deps: UserDeps,
  userId: string,
  role: string,
  input: InviteParentInput,
): Promise<ParentInviteResult> {
  if (role !== "STUDENT") {
    throw new AppError(403, UserErrorCode.INVITE_INVALID_TARGET, "Only students can invite a parent");
  }

  const existingInvite = await deps.parentInviteRepository.findPending(
    userId,
    input.parentEmail,
    input.parentPhone,
  );
  if (existingInvite) {
    throw new AppError(
      409,
      UserErrorCode.INVITE_ALREADY_PENDING,
      "An invite to this parent is already pending",
    );
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + deps.config.parentInviteTtlSec * 1000);

  const invite = await deps.parentInviteRepository.create({
    studentId: userId,
    parentEmail: input.parentEmail,
    parentPhone: input.parentPhone,
    token,
    expiresAt,
  });

  return { inviteId: invite.id, token: invite.token, expiresAt: invite.expiresAt };
}
