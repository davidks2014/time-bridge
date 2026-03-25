/*
  Warnings:

  - You are about to drop the column `videoUrl` on the `MemoryItem` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ItemType" ADD VALUE 'IMAGE';

-- AlterTable
ALTER TABLE "IdentityVerificationRequest" ADD COLUMN     "idImageBackPublicId" TEXT,
ADD COLUMN     "idImageFrontPublicId" TEXT;

-- AlterTable
ALTER TABLE "MemoryItem" DROP COLUMN "videoUrl",
ADD COLUMN     "mediaFileName" TEXT,
ADD COLUMN     "mediaMimeType" TEXT,
ADD COLUMN     "mediaPublicId" TEXT,
ADD COLUMN     "mediaUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "verificationDocBackPublicId" TEXT,
ADD COLUMN     "verificationDocFrontPublicId" TEXT;

-- CreateIndex
CREATE INDEX "MemoryItem_status_idx" ON "MemoryItem"("status");
