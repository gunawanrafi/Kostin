import path from "node:path";
import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

// Prisma 6 no longer auto-loads .env when a prisma.config.ts is present, and
// this package's DATABASE_URL lives in the monorepo ROOT .env (two levels up),
// not here. Load it explicitly so every Prisma CLI command (studio, migrate,
// deploy, generate, …) sees DATABASE_URL without a manual env prefix.
// Resolved from this file's own location so it works regardless of the cwd the
// command is run from (package dir, repo root via turbo, etc.).
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
});
