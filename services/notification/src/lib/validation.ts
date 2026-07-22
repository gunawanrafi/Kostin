import { z } from "zod";

export const NOTIFICATION_EVENT_TYPES = [
  "BOOKING_CONFIRMED",
  "BOOKING_CANCELLED",
  "PAYMENT_SUCCESS",
  "NEW_INQUIRY",
  "OTP_REQUEST",
] as const;
export type NotificationEventTypeValue = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const sendNotificationSchema = z.object({
  userId: z.string().min(1),
  eventType: z.enum(NOTIFICATION_EVENT_TYPES),
  // Template variables (e.g. { listingTitle, amount }) plus anything the
  // client should receive verbatim in the push payload's `data` field.
  data: z.record(z.string(), z.unknown()).optional().default({}),
  // Optional copy override — falls back to the eventType's template.
  title: z.string().trim().min(1).max(150).optional(),
  body: z.string().trim().min(1).max(1000).optional(),
});
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;

const statusFilterSchema = z.enum(["UNREAD", "READ"]);

export const listNotificationsQuerySchema = z.object({
  status: statusFilterSchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListNotificationsQueryInput = z.infer<typeof listNotificationsQuerySchema>;
