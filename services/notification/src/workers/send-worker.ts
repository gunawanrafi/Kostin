import { Worker, type Job } from "bullmq";
import type { PrismaClient } from "@kostin/database";
import { NOTIFICATION_SEND_QUEUE_NAME, type SendJobData } from "../lib/notification-queue.js";
import type { PushSender } from "../lib/push-sender.js";
import { parseRedisConnectionOptions } from "../lib/redis-connection.js";

// Processes the delivery job enqueued by sendNotification(). Loads the
// already-persisted Notification + its recipient, sends via FCM if the user
// has a registered device token, and stamps sentAt. No token = the
// notification still exists (in-app inbox works via GET /notifications) —
// push delivery is simply skipped, not an error.
export function createSendWorker(
  prisma: PrismaClient,
  pushSender: PushSender,
  redisUrl: string,
): Worker<SendJobData> {
  const connection = { ...parseRedisConnectionOptions(redisUrl), maxRetriesPerRequest: null };

  return new Worker<SendJobData>(
    NOTIFICATION_SEND_QUEUE_NAME,
    async (job: Job<SendJobData>) => {
      const { notificationId } = job.data;

      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        include: { user: { select: { fcmToken: true } } },
      });
      if (!notification) return;
      // Idempotency guard: BullMQ may retry a job that actually succeeded
      // (e.g. worker crashed after the FCM call but before ack).
      if (notification.sentAt) return;

      const token = notification.user.fcmToken;
      if (token) {
        const data = (notification.data ?? {}) as Record<string, unknown>;
        await pushSender.send({
          token,
          title: notification.title,
          body: notification.body,
          data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
        });
      }

      await prisma.notification.update({ where: { id: notificationId }, data: { sentAt: new Date() } });
    },
    { connection },
  );
}
