import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import type { PushSender } from "./lib/push-sender.js";

// Load the monorepo root .env before anything else. Everything below that
// touches @kostin/database is dynamically imported *after* this call — a
// static `import` would be hoisted and evaluated before this file's own
// top-level code runs, so PrismaClient would already be constructed
// against a missing DATABASE_URL by the time dotenv.config() executed.
// (The `import type` above is erased at compile time — it creates no
// runtime import, so it's safe to keep static.)
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const { prisma } = await import("@kostin/database");
const { buildApp } = await import("./app.js");
const { loadConfig } = await import("./config.js");
const { BullMqNotificationQueue } = await import("./lib/notification-queue.js");
const { FirebasePushSender, NoopPushSender } = await import("./lib/push-sender.js");
const { createSendWorker } = await import("./workers/send-worker.js");

const config = loadConfig();
const notificationQueue = new BullMqNotificationQueue(config.redisUrl);
const pushSender: PushSender =
  config.firebaseProjectId && config.firebaseClientEmail && config.firebasePrivateKey
    ? new FirebasePushSender({
        projectId: config.firebaseProjectId,
        clientEmail: config.firebaseClientEmail,
        privateKey: config.firebasePrivateKey,
      })
    : new NoopPushSender();
const sendWorker = createSendWorker(prisma, pushSender, config.redisUrl);

const app = buildApp({ config, notificationQueue });

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

const shutdown = async (): Promise<void> => {
  await Promise.allSettled([app.close(), sendWorker.close()]);
  process.exit(0);
};
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

void start();
