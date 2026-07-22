-- AlterTable
ALTER TABLE "listings" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "listings_deletedAt_idx" ON "listings"("deletedAt");
