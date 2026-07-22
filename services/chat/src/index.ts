import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ApiResponse } from "@kostin/types";

// Load the monorepo root .env before anything else references process.env.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const PORT = parseInt(process.env["PORT"] ?? "3007", 10);
const HOST = process.env["HOST"] ?? "0.0.0.0";

const app = Fastify({ logger: true });

await app.register(cors, { origin: process.env["CORS_ORIGIN"] ?? "*" });

app.get("/health", async (): Promise<ApiResponse<{ status: string }>> => ({
  data: { status: "ok" },
  error: null,
  meta: { requestId: crypto.randomUUID() },
}));

const httpServer = createServer(app.server);

const io = new Server(httpServer, {
  cors: { origin: process.env["CORS_ORIGIN"] ?? "*" },
});

io.on("connection", (socket) => {
  app.log.info({ socketId: socket.id }, "client connected");

  socket.on("join_room", (roomId: string) => {
    void socket.join(roomId);
  });

  socket.on("send_message", (payload: { roomId: string; message: string }) => {
    io.to(payload.roomId).emit("new_message", payload);
  });

  socket.on("disconnect", () => {
    app.log.info({ socketId: socket.id }, "client disconnected");
  });
});

const start = async (): Promise<void> => {
  try {
    await app.ready();
    httpServer.listen(PORT, HOST, () => {
      app.log.info(`chat-service listening on ${HOST}:${PORT}`);
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
