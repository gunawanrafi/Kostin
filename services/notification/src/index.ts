import Fastify from "fastify";
import cors from "@fastify/cors";
import { Queue } from "bullmq";
import type { ApiResponse, NotificationPayload } from "@kostin/types";

const PORT = parseInt(process.env["PORT"] ?? "3008", 10);
const HOST = process.env["HOST"] ?? "0.0.0.0";

const REDIS_URL = process.env["REDIS_URL"] ?? "redis://localhost:6379";
const redisConnection = { url: REDIS_URL };

export const notificationQueue = new Queue<NotificationPayload>(
  "notifications",
  { connection: redisConnection }
);

const app = Fastify({ logger: true });

await app.register(cors, { origin: process.env["CORS_ORIGIN"] ?? "*" });

app.get("/health", async (): Promise<ApiResponse<{ status: string }>> => ({
  data: { status: "ok" },
  error: null,
  meta: { requestId: crypto.randomUUID() },
}));

app.post<{ Body: NotificationPayload }>(
  "/send",
  async (request): Promise<ApiResponse<{ jobId: string | undefined }>> => {
    const job = await notificationQueue.add("send", request.body);
    return { data: { jobId: job.id }, error: null, meta: {} };
  }
);

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
