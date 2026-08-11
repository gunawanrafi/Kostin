import type { User } from "@kostin/database";
import { buildApp } from "../app.js";
import type { AuthConfig } from "../config.js";
import type { GoogleProfile, GoogleVerifier } from "../lib/google.js";
import type { OtpSender } from "../lib/otp.js";
import { InMemoryRedis } from "../lib/redis.js";
import type { CreateUserInput, UserRepository } from "../lib/user-repository.js";
import type { AuthDeps } from "../services/auth.service.js";

export function testConfig(overrides: Partial<AuthConfig> = {}): AuthConfig {
  return {
    port: 0,
    host: "127.0.0.1",
    corsOrigin: "*",
    databaseUrl: "",
    redisUrl: "",
    jwtAccessSecret: "test_access_secret",
    jwtRefreshSecret: "test_refresh_secret",
    accessTokenTtlSec: 15 * 60,
    refreshTokenTtlSec: 7 * 24 * 60 * 60,
    otpTtlSec: 300,
    otpMaxAttempts: 5,
    otpRequestCooldownSec: 60,
    googleClientId: "test-google-client-id",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioWhatsappFrom: "whatsapp:+14155238886",
    ...overrides,
  };
}

// In-memory UserRepository fake — mirrors the Prisma-backed one's behavior
// (unique email/phone/googleId, findFirst-by-OR) without touching Postgres.
export function createFakeUserRepository(seed: User[] = []): UserRepository & { users: User[] } {
  const users = [...seed];

  const clone = (u: User): User => ({ ...u });

  return {
    users,
    findByEmail: async (email) => {
      const found = users.find((u) => u.email === email);
      return found ? clone(found) : null;
    },
    findByPhone: async (phone) => {
      const found = users.find((u) => u.phone === phone);
      return found ? clone(found) : null;
    },
    findByEmailOrPhone: async (email, phone) => {
      const found = users.find((u) => u.email === email || u.phone === phone);
      return found ? clone(found) : null;
    },
    findByGoogleId: async (googleId) => {
      const found = users.find((u) => u.googleId === googleId);
      return found ? clone(found) : null;
    },
    findById: async (id) => {
      const found = users.find((u) => u.id === id);
      return found ? clone(found) : null;
    },
    create: async (input: CreateUserInput) => {
      const now = new Date();
      const user: User = {
        id: crypto.randomUUID(),
        name: input.name,
        email: input.email,
        phone: input.phone,
        role: input.role,
        status: "PENDING_VERIFICATION",
        avatarUrl: null,
        passwordHash: input.passwordHash ?? null,
        googleId: input.googleId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      users.push(user);
      return clone(user);
    },
    linkGoogleId: async (id, googleId) => {
      const user = users.find((u) => u.id === id);
      if (!user) throw new Error("user not found");
      user.googleId = googleId;
      user.updatedAt = new Date();
      return clone(user);
    },
    activate: async (id) => {
      const user = users.find((u) => u.id === id);
      if (!user) throw new Error("user not found");
      user.status = "ACTIVE";
      user.updatedAt = new Date();
      return clone(user);
    },
    updatePassword: async (id, passwordHash) => {
      const user = users.find((u) => u.id === id);
      if (!user) throw new Error("user not found");
      user.passwordHash = passwordHash;
      user.updatedAt = new Date();
      return clone(user);
    },
  };
}

export function createFakeOtpSender(): OtpSender & { sent: { phone: string; code: string }[] } {
  const sent: { phone: string; code: string }[] = [];
  return {
    sent,
    sendWhatsappOtp: async (phone, code) => {
      sent.push({ phone, code });
    },
  };
}

export function createFakeGoogleVerifier(
  profile: GoogleProfile | (() => GoogleProfile),
): GoogleVerifier {
  return {
    verifyIdToken: async () => (typeof profile === "function" ? profile() : profile),
  };
}

export interface TestDepsOverrides {
  config?: Partial<AuthConfig>;
  users?: User[];
}

export function createTestDeps(overrides: TestDepsOverrides = {}): AuthDeps & {
  userRepository: ReturnType<typeof createFakeUserRepository>;
  otpSender: ReturnType<typeof createFakeOtpSender>;
  redis: InMemoryRedis;
} {
  return {
    config: testConfig(overrides.config),
    userRepository: createFakeUserRepository(overrides.users),
    redis: new InMemoryRedis(),
    otpSender: createFakeOtpSender(),
    googleVerifier: createFakeGoogleVerifier({
      googleId: "google-uid-1",
      email: "googleuser@example.com",
      name: "Google User",
    }),
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
