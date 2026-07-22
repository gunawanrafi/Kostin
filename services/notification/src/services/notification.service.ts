import type { NotificationConfig } from "../config.js";
import { toPublicNotification, type PublicNotification } from "../lib/dto.js";
import { AppError, NotificationErrorCode } from "../lib/errors.js";
import type {
  ListNotificationsFilters,
  NotificationRepository,
} from "../lib/notification-repository.js";
import type { NotificationQueue } from "../lib/notification-queue.js";
import { renderNotificationCopy } from "../lib/templates.js";
import type { ListNotificationsQueryInput, SendNotificationInput } from "../lib/validation.js";

export interface NotificationDeps {
  config: NotificationConfig;
  notificationRepository: NotificationRepository;
  notificationQueue: NotificationQueue;
}

export async function sendNotification(
  deps: NotificationDeps,
  input: SendNotificationInput,
): Promise<PublicNotification> {
  const exists = await deps.notificationRepository.userExists(input.userId);
  if (!exists) throw new AppError(404, NotificationErrorCode.NOT_FOUND, "User not found");

  const rendered = renderNotificationCopy(input.eventType, input.data);

  const notification = await deps.notificationRepository.create({
    userId: input.userId,
    eventType: input.eventType,
    title: input.title ?? rendered.title,
    body: input.body ?? rendered.body,
    data: input.data,
  });

  // Persist first, deliver async — the worker owns the actual FCM call and
  // marks sentAt once it succeeds. This request returns as soon as the
  // notification exists (and is already visible via GET /notifications).
  await deps.notificationQueue.enqueueSend(notification.id);

  return toPublicNotification(notification);
}

export interface ListNotificationsResult {
  items: PublicNotification[];
  page: number;
  limit: number;
  total: number;
}

export async function listNotifications(
  deps: NotificationDeps,
  userId: string,
  query: ListNotificationsQueryInput,
): Promise<ListNotificationsResult> {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? deps.config.defaultPageSize, deps.config.maxPageSize);
  const filters: ListNotificationsFilters = { ...(query.status !== undefined ? { status: query.status } : {}) };

  const { items, total } = await deps.notificationRepository.findByUserId(userId, filters, page, limit);
  return { items: items.map(toPublicNotification), page, limit, total };
}

export async function markNotificationRead(
  deps: NotificationDeps,
  userId: string,
  notificationId: string,
): Promise<PublicNotification> {
  const notification = await deps.notificationRepository.findById(notificationId);
  if (!notification) throw new AppError(404, NotificationErrorCode.NOT_FOUND, "Notification not found");
  if (notification.userId !== userId) {
    throw new AppError(403, NotificationErrorCode.FORBIDDEN, "You do not have access to this notification");
  }

  // Idempotent: re-marking an already-read notification preserves the
  // original readAt instead of bumping it.
  if (notification.status === "READ") return toPublicNotification(notification);

  const updated = await deps.notificationRepository.markRead(notificationId);
  return toPublicNotification(updated);
}
