// CRITICAL: This service handles real money. 100% test coverage is required.
// Never add logic here without a corresponding test.
import Fastify from "fastify";
import cors from "@fastify/cors";
import type { ApiResponse } from "@kostin/types";

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
