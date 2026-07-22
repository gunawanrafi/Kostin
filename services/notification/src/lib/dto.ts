import type { Notification, NotificationChannel, NotificationEventType, NotificationStatus } from "@kostin/database";

export interface PublicNotification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  eventType: NotificationEventType | null;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  sentAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
}

export function toPublicNotification(notification: Notification): PublicNotification {
  return {
    id: notification.id,
    userId: notification.userId,
    channel: notification.channel,
    status: notification.status,
    eventType: notification.eventType,
    title: notification.title,
    body: notification.body,
    data: (notification.data as Record<string, unknown> | null) ?? null,
    sentAt: notification.sentAt,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}
