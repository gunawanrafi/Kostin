import { Worker, type Job } from "bullmq";
import type { PrismaClient } from "@kostin/database";
import { AUTO_CANCEL_QUEUE_NAME, type AutoCancelJobData } from "../lib/booking-queue.js";
import { parseRedisConnectionOptions } from "../lib/redis.js";

// Processes the delayed auto-cancel job scheduled by createBooking(). If the
// booking is still PENDING when the job fires (24h later, by default), the
// owner never confirmed in time — cancel it. Any other status means the
// booking was already confirmed/cancelled, so this is a no-op (the job is
// also proactively removed by confirmBooking()/cancelBooking(), but this
// guard covers the race where the job fired just before that removal landed).
export function createAutoCancelWorker(prisma: PrismaClient, redisUrl: string): Worker<AutoCancelJobData> {
  const connection = { ...parseRedisConnectionOptions(redisUrl), maxRetriesPerRequest: null };

  return new Worker<AutoCancelJobData>(
    AUTO_CANCEL_QUEUE_NAME,
    async (job: Job<AutoCancelJobData>) => {
      const { bookingId } = job.data;
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking || booking.status !== "PENDING") return;

      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "AUTO_CANCEL_TIMEOUT" },
      });
    },
    { connection },
  );
}
