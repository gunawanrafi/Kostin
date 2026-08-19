/*
  Warnings:

  - You are about to drop the column `available` on the `rooms` table. All the data in the column will be lost.
  - The `amenities` column on the `rooms` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
ALTER TYPE "RoomStatus" ADD VALUE 'OCCUPIED';

-- DropIndex
DROP INDEX "rooms_listingId_available_idx";

-- AlterTable
ALTER TABLE "rooms" DROP COLUMN "available",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "amenities",
ADD COLUMN     "amenities" TEXT[];

-- CreateIndex
CREATE INDEX "rooms_deletedAt_idx" ON "rooms"("deletedAt");
