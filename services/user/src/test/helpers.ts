import jwt from "jsonwebtoken";
import type { ParentInvite, User, UserProfile } from "@kostin/database";
import { buildApp } from "../app.js";
import type { UserConfig } from "../config.js";
import type { AvatarUploader, AvatarUploadResult } from "../lib/avatar-uploader.js";
import type {
  CreateParentInviteInput,
  ParentInviteRepository,
} from "../lib/parent-invite-repository.js";
import type { UpdateMeInput, UserRepository } from "../lib/user-repository.js";

export function testConfig(overrides: Partial<UserConfig> = {}): UserConfig {
  return {
    port: 0,
    host: "127.0.0.1",
    corsOrigin: "*",
    databaseUrl: "",
    jwtAccessSecret: "test_access_secret",
    parentInviteTtlSec: 7 * 24 * 60 * 60,
    cloudinaryCloudName: "test-cloud",
    cloudinaryApiKey: "test-key",
    cloudinaryApiSecret: "test-secret",
    ...overrides,
  };
}

export function signAccessToken(
  userId: string,
  role: string,
  secret: string = testConfig().jwtAccessSecret,
): string {
  return jwt.sign({ sub: userId, role, type: "access" }, secret, { expiresIn: "15m" });
}

export function makeUser(overrides: Partial<User> = {}): User {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    email: "student@example.com",
    phone: "+6281234567890",
    name: "Budi Santoso",
    role: "STUDENT",
    status: "ACTIVE",
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
    passwordHash: null,
    googleId: null,
    ...overrides,
  };
}

// In-memory UserRepository fake — mirrors the Prisma-backed one's behavior
// (separate User + UserProfile rows keyed by userId) without touching Postgres.
export function createFakeUserRepository(
  seedUsers: User[] = [],
  seedProfiles: UserProfile[] = [],
): UserRepository & { users: User[]; profiles: UserProfile[] } {
  const users = [...seedUsers];
  const profiles = [...seedProfiles];

  const cloneUser = (u: User): User => ({ ...u });
  const cloneProfile = (p: UserProfile): UserProfile => ({ ...p });

  const makeProfile = (userId: string, fields: Partial<UserProfile> = {}): UserProfile => ({
    id: crypto.randomUUID(),
    userId,
    name: null,
    avatar: null,
    bio: null,
    university: null,
    major: null,
    yearOfStudy: null,
    lifestyle: {},
    preferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...fields,
  });

  return {
    users,
    profiles,
    findById: async (id) => {
      const found = users.find((u) => u.id === id);
      return found ? cloneUser(found) : null;
    },
    findProfileByUserId: async (userId) => {
      const found = profiles.find((p) => p.userId === userId);
      return found ? cloneProfile(found) : null;
    },
    updateMe: async (userId, input: UpdateMeInput) => {
      const user = users.find((u) => u.id === userId);
      if (!user) throw new Error("user not found");
      if (input.name !== undefined) {
        user.name = input.name;
        user.updatedAt = new Date();
      }

      const { name: _name, ...profileFields } = input;
      const hasProfileFields = Object.values(profileFields).some((v) => v !== undefined);

      let profile = profiles.find((p) => p.userId === userId) ?? null;
      if (hasProfileFields) {
        if (!profile) {
          profile = makeProfile(userId, profileFields);
          profiles.push(profile);
        } else {
          Object.assign(profile, profileFields, { updatedAt: new Date() });
        }
      }

      return { user: cloneUser(user), profile: profile ? cloneProfile(profile) : null };
    },
    updateAvatarUrl: async (userId, avatarUrl) => {
      const user = users.find((u) => u.id === userId);
      if (!user) throw new Error("user not found");
      user.avatarUrl = avatarUrl;
      user.updatedAt = new Date();
      return cloneUser(user);
    },
    updateLifestyle: async (userId, lifestyle) => {
      let profile = profiles.find((p) => p.userId === userId) ?? null;
      if (!profile) {
        profile = makeProfile(userId, { lifestyle });
        profiles.push(profile);
      } else {
        profile.lifestyle = lifestyle;
        profile.updatedAt = new Date();
      }
      return cloneProfile(profile);
    },
  };
}

export function createFakeParentInviteRepository(): ParentInviteRepository & {
  invites: ParentInvite[];
} {
  const invites: ParentInvite[] = [];

  return {
    invites,
    findPending: async (studentId, parentEmail, parentPhone) => {
      const found = invites.find(
        (i) =>
          i.studentId === studentId &&
          i.status === "PENDING" &&
          ((parentEmail && i.parentEmail === parentEmail) ||
            (parentPhone && i.parentPhone === parentPhone)),
      );
      return found ? { ...found } : null;
    },
    create: async (input: CreateParentInviteInput) => {
      const now = new Date();
      const invite: ParentInvite = {
        id: crypto.randomUUID(),
        studentId: input.studentId,
        parentEmail: input.parentEmail ?? null,
        parentPhone: input.parentPhone ?? null,
        token: input.token,
        status: "PENDING",
        expiresAt: input.expiresAt,
        acceptedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      invites.push(invite);
      return { ...invite };
    },
  };
}

export function createFakeAvatarUploader(): AvatarUploader & {
  uploads: Array<{ userId: string; size: number }>;
} {
  const uploads: Array<{ userId: string; size: number }> = [];
  return {
    uploads,
    upload: async (buffer: Buffer, userId: string): Promise<AvatarUploadResult> => {
      uploads.push({ userId, size: buffer.byteLength });
      return { url: `https://res.cloudinary.com/test-cloud/image/upload/kostin/avatars/${userId}.jpg` };
    },
  };
}

export interface TestDepsOverrides {
  config?: Partial<UserConfig>;
  users?: User[];
  profiles?: UserProfile[];
}

export function createTestDeps(overrides: TestDepsOverrides = {}) {
  return {
    config: testConfig(overrides.config),
    userRepository: createFakeUserRepository(overrides.users, overrides.profiles),
    parentInviteRepository: createFakeParentInviteRepository(),
    avatarUploader: createFakeAvatarUploader(),
  };
}

// Wires createTestDeps() straight into buildApp() with logging silenced, so
// each test file just does `const app = buildTestApp()` and gets a fully
// isolated Fastify instance backed by in-memory fakes.
export function buildTestApp(overrides: TestDepsOverrides = {}) {
  const deps = createTestDeps(overrides);
  const app = buildApp({ ...deps, logger: false });
  return { app, deps };
}
