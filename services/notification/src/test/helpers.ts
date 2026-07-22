import jwt from "jsonwebtoken";
import type { Notification, NotificationEventType } from "@kostin/database";
import { buildApp } from "../app.js";
import type { NotificationConfig } from "../config.js";
import type {
  CreateNotificationData,
  ListNotificationsFilters,
  NotificationRepository,
} from "../lib/notification-repository.js";
import type { NotificationQueue } from "../lib/notification-queue.js";
import type { PushMessage, PushSender } from "../lib/push-sender.js";

export function testConfig(overrides: Partial<NotificationConfig> = {}): NotificationConfig {
  return {
    port: 0,
    host: "127.0.0.1",
    corsOrigin: "*",
    databaseUrl: "",
    redisUrl: "",
    jwtAccessSecret: "test_access_secret",
    internalApiKey: "test_internal_api_key",
    defaultPageSize: 20,
    maxPageSize: 50,
    firebaseProjectId: "test-project",
    firebaseClientEmail: "test@example.iam.gserviceaccount.com",
    firebasePrivateKey: "test-private-key",
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

export function makeNotification(overrides: Partial<Notification> = {}): Notification {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    userId: "student-1",
    channel: "PUSH",
    status: "UNREAD",
    eventType: "BOOKING_CONFIRMED",
    title: "Booking Dikonfirmasi",
    body: "Booking Anda telah dikonfirmasi.",
    data: {},
    sentAt: null,
    readAt: null,
    createdAt: now,
    ...overrides,
  };
}

// In-memory NotificationRepository fake, backed by seed notifications and a
// known set of user ids — mirrors the Prisma-backed implementation's
// lookups/filters/pagination without touching Postgres.
export function createFakeNotificationRepository(
  seed: { notifications?: Notification[]; userIds?: string[] } = {},
): NotificationRepository & { notifications: Notification[] } {
  const notifications = [...(seed.notifications ?? [])];
  const userIds = new Set(seed.userIds ?? ["student-1", "owner-1"]);

  const clone = (n: Notification): Notification => ({ ...n, data: n.data === null ? null : { ...(n.data as object) } });

  return {
    notifications,
    findById: async (id) => {
      const found = notifications.find((n) => n.id === id);
      return found ? clone(found) : null;
    },
    findByUserId: async (userId, filters: ListNotificationsFilters, page, limit) => {
      const matching = notifications
        .filter((n) => n.userId === userId)
        .filter((n) => !filters.status || n.status === filters.status)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const start = (page - 1) * limit;
      return { items: matching.slice(start, start + limit).map(clone), total: matching.length };
    },
    create: async (input: CreateNotificationData) => {
      const now = new Date();
      const notification: Notification = {
        id: crypto.randomUUID(),
        userId: input.userId,
        channel: "PUSH",
        status: "UNREAD",
        eventType: input.eventType as NotificationEventType,
        title: input.title,
        body: input.body,
        data: input.data,
        sentAt: null,
        readAt: null,
        createdAt: now,
      };
      notifications.push(notification);
      return clone(notification);
    },
    markSent: async (id) => {
      const notification = notifications.find((n) => n.id === id);
      if (!notification) throw new Error("Notification not found");
      notification.sentAt = new Date();
      return clone(notification);
    },
    markRead: async (id) => {
      const notification = notifications.find((n) => n.id === id);
      if (!notification) throw new Error("Notification not found");
      notification.status = "READ";
      notification.readAt = new Date();
      return clone(notification);
    },
    userExists: async (userId) => userIds.has(userId),
  };
}

export function createFakeNotificationQueue(): NotificationQueue & { enqueued: string[] } {
  const enqueued: string[] = [];
  return {
    enqueued,
    enqueueSend: async (notificationId) => {
      enqueued.push(notificationId);
    },
  };
}

export function createFakePushSender(): PushSender & { sent: PushMessage[] } {
  const sent: PushMessage[] = [];
  return {
    sent,
    send: async (message) => {
      sent.push(message);
    },
  };
}

export interface TestDepsOverrides {
  config?: Partial<NotificationConfig>;
  notifications?: Notification[];
  userIds?: string[];
}

export function createTestDeps(overrides: TestDepsOverrides = {}) {
  return {
    config: testConfig(overrides.config),
    notificationRepository: createFakeNotificationRepository({
      notifications: overrides.notifications,
      userIds: overrides.userIds,
    }),
    notificationQueue: createFakeNotificationQueue(),
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
