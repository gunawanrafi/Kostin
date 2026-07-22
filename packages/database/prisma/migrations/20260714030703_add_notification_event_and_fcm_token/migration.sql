-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'PAYMENT_SUCCESS', 'NEW_INQUIRY', 'OTP_REQUEST');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "eventType" "NotificationEventType";

-- AlterTable
ALTER TABLE "users" ADD COLUMN "fcmToken" TEXT;
