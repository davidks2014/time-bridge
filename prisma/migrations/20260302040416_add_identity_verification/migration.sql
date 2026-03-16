/*
  Warnings:

  - You are about to drop the column `releasedAt` on the `MemoryItem` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('DRAFT', 'ACTIVE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropIndex
DROP INDEX "MemoryItem_releasedAt_idx";

-- AlterTable
ALTER TABLE "MemoryCollection" ADD COLUMN     "status" "CollectionStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "MemoryItem" DROP COLUMN "releasedAt";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "IdentityVerificationRequest" (
    "id" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "inviteTokenUsed" TEXT,
    "identificationNoSubmitted" TEXT NOT NULL,
    "idImageFrontUrl" TEXT NOT NULL,
    "idImageBackUrl" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityVerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdentityVerificationRequest_receiverId_idx" ON "IdentityVerificationRequest"("receiverId");

-- CreateIndex
CREATE INDEX "IdentityVerificationRequest_requesterUserId_idx" ON "IdentityVerificationRequest"("requesterUserId");

-- CreateIndex
CREATE INDEX "IdentityVerificationRequest_status_idx" ON "IdentityVerificationRequest"("status");

-- CreateIndex
CREATE INDEX "MemoryCollection_ownerId_idx" ON "MemoryCollection"("ownerId");

-- CreateIndex
CREATE INDEX "MemoryCollection_receiverId_idx" ON "MemoryCollection"("receiverId");

-- CreateIndex
CREATE INDEX "Receiver_ownerId_idx" ON "Receiver"("ownerId");

-- CreateIndex
CREATE INDEX "Receiver_identificationNo_idx" ON "Receiver"("identificationNo");

-- CreateIndex
CREATE INDEX "ReceiverInvite_receiverId_idx" ON "ReceiverInvite"("receiverId");

-- CreateIndex
CREATE INDEX "ReceiverInvite_createdAt_idx" ON "ReceiverInvite"("createdAt");

-- AddForeignKey
ALTER TABLE "IdentityVerificationRequest" ADD CONSTRAINT "IdentityVerificationRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Receiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerificationRequest" ADD CONSTRAINT "IdentityVerificationRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
