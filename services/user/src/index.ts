import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load the monorepo root .env before anything else. Everything below that
// touches @kostin/database is dynamically imported *after* this call — a
// static `import` would be hoisted and evaluated before this file's own
// top-level code runs, so PrismaClient would already be constructed
// against a missing DATABASE_URL by the time dotenv.config() executed.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const { buildApp } = await import("./app.js");
const { loadConfig } = await import("./config.js");

const config = loadConfig();
const app = buildApp({ config });

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
