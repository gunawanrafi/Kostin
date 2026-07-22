-- AlterTable
ALTER TABLE "bookings"
  ADD COLUMN "ktmUrl" TEXT,
  ADD COLUMN "ktpUrl" TEXT,
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelReason" TEXT;
