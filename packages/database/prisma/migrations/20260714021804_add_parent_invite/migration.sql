-- CreateEnum
CREATE TYPE "ParentInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "parent_invites" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentEmail" TEXT,
    "parentPhone" TEXT,
    "token" TEXT NOT NULL,
    "status" "ParentInviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parent_invites_token_key" ON "parent_invites"("token");

-- CreateIndex
CREATE INDEX "parent_invites_studentId_idx" ON "parent_invites"("studentId");

-- CreateIndex
CREATE INDEX "parent_invites_studentId_status_idx" ON "parent_invites"("studentId", "status");

-- AddForeignKey
ALTER TABLE "parent_invites" ADD CONSTRAINT "parent_invites_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
