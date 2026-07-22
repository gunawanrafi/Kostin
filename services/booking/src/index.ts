import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Redis } from "ioredis";

// Load the monorepo root .env before anything else. Everything below that
// touches @kostin/database is dynamically imported *after* this call — a
// static `import` would be hoisted and evaluated before this file's own
// top-level code runs, so PrismaClient would already be constructed
// against a missing DATABASE_URL by the time dotenv.config() executed.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const { prisma } = await import("@kostin/database");
const { buildApp } = await import("./app.js");
const { loadConfig } = await import("./config.js");
const { BullMqBookingQueue } = await import("./lib/booking-queue.js");
const { createAutoCancelWorker } = await import("./workers/auto-cancel-worker.js");

const config = loadConfig();
const redis = new Redis(config.redisUrl);
const bookingQueue = new BullMqBookingQueue(config.redisUrl);
const autoCancelWorker = createAutoCancelWorker(prisma, config.redisUrl);

const app = buildApp({ config, redis, bookingQueue });

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

const shutdown = async (): Promise<void> => {
  await Promise.allSettled([app.close(), autoCancelWorker.close(), redis.quit()]);
  process.exit(0);
};
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

void start();
