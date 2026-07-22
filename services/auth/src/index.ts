import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Redis } from "ioredis";

// Load the monorepo root .env before anything else. Everything below that
// touches @kostin/database is dynamically imported *after* this call — a
// static `import` would be hoisted and evaluated before this file's own
// top-level code runs, so PrismaClient would already be constructed
// against a missing DATABASE_URL by the time dotenv.config() executed.
// Resolved from this file's own location (not process.cwd()) so it works
// the same whether started from this service's directory, via turbo from
// the repo root, or as the compiled dist/index.js.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const { buildApp } = await import("./app.js");
const { loadConfig } = await import("./config.js");

const config = loadConfig();
const redis = new Redis(config.redisUrl);

const app = buildApp({ config, redis });

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
