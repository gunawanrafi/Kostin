import { Queue } from "bullmq";
import { parseRedisConnectionOptions } from "./redis.js";

export const AUTO_CANCEL_QUEUE_NAME = "booking-auto-cancel";
export const AUTO_CANCEL_JOB_NAME = "auto-cancel";

export interface AutoCancelJobData {
  bookingId: string;
}

// Narrow surface of BullMQ's Queue actually used by the service layer, so
// tests can inject an in-memory fake instead of a real Redis-backed queue.
export interface BookingQueue {
  // Schedules a delayed job that fires if the booking is still PENDING
  // `delayMs` later (default 24h, per the auto-cancel requirement).
  scheduleAutoCancel(bookingId: string, delayMs: number): Promise<void>;
  // Removes a previously-scheduled auto-cancel job — called when a booking
  // is confirmed or cancelled before the timer fires, so a stale job can't
  // later cancel an already-resolved booking.
  cancelAutoCancel(bookingId: string): Promise<void>;
}

export class BullMqBookingQueue implements BookingQueue {
  private readonly queue: Queue<AutoCancelJobData>;

  constructor(redisUrl: string) {
    // BullMQ requires `maxRetriesPerRequest: null` on the connection it owns
    // (its blocking commands break with ioredis's default retry behavior).
    this.queue = new Queue<AutoCancelJobData>(AUTO_CANCEL_QUEUE_NAME, {
      connection: { ...parseRedisConnectionOptions(redisUrl), maxRetriesPerRequest: null },
    });
  }

  async scheduleAutoCancel(bookingId: string, delayMs: number): Promise<void> {
    // jobId = bookingId gives us "one pending auto-cancel per booking" and
    // an easy handle for cancelAutoCancel() to remove by.
    await this.queue.add(
      AUTO_CANCEL_JOB_NAME,
      { bookingId },
      { jobId: bookingId, delay: delayMs, removeOnComplete: true, removeOnFail: true },
    );
  }

  async cancelAutoCancel(bookingId: string): Promise<void> {
    const job = await this.queue.getJob(bookingId);
    if (job) await job.remove();
  }
}
