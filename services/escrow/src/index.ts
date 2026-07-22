// CRITICAL: This service handles real money. 100% test coverage is required.
// Never add logic here without a corresponding test.
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Fastify from "fastify";
import cors from "@fastify/cors";
import type { ApiResponse } from "@kostin/types";

// Load the monorepo root .env before anything else references process.env.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const PORT = parseInt(process.env["PORT"] ?? "3005", 10);
const HOST = process.env["HOST"] ?? "0.0.0.0";

const app = Fastify({ logger: true });

await app.register(cors, { origin: process.env["CORS_ORIGIN"] ?? "*" });

app.get("/health", async (): Promise<ApiResponse<{ status: string }>> => ({
  data: { status: "ok" },
  error: null,
  meta: { requestId: crypto.randomUUID() },
}));

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
