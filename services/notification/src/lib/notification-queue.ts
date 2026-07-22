import { Queue } from "bullmq";
import { parseRedisConnectionOptions } from "./redis-connection.js";

export const NOTIFICATION_SEND_QUEUE_NAME = "notification-send";
export const NOTIFICATION_SEND_JOB_NAME = "send";

export interface SendJobData {
  notificationId: string;
}

// Narrow surface of BullMQ's Queue actually used by the service layer, so
// tests can inject an in-memory fake instead of a real Redis-backed queue.
// This IS the "BullMQ worker untuk process notification queue" pipeline:
// POST /notifications/send persists the Notification row synchronously,
// then enqueues delivery — the worker (workers/send-worker.ts) does the
// actual FCM call asynchronously.
export interface NotificationQueue {
  enqueueSend(notificationId: string): Promise<void>;
}

export class BullMqNotificationQueue implements NotificationQueue {
  private readonly queue: Queue<SendJobData>;

  constructor(redisUrl: string) {
    this.queue = new Queue<SendJobData>(NOTIFICATION_SEND_QUEUE_NAME, {
      connection: { ...parseRedisConnectionOptions(redisUrl), maxRetriesPerRequest: null },
    });
  }

  async enqueueSend(notificationId: string): Promise<void> {
    await this.queue.add(
      NOTIFICATION_SEND_JOB_NAME,
      { notificationId },
      {
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      },
    );
  }
}
