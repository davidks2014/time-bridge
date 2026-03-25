/*
  Warnings:

  - You are about to drop the column `mediaFileName` on the `MemoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `mediaMimeType` on the `MemoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `mediaPublicId` on the `MemoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `mediaUrl` on the `MemoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `MemoryItem` table. All the data in the column will be lost.
  - Made the column `content` on table `MemoryItem` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "MemoryItem" DROP COLUMN "mediaFileName",
DROP COLUMN "mediaMimeType",
DROP COLUMN "mediaPublicId",
DROP COLUMN "mediaUrl",
DROP COLUMN "type",
ALTER COLUMN "content" SET NOT NULL;

-- DropEnum
DROP TYPE "ItemType";

-- CreateTable
CREATE TABLE "MemoryAttachment" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaPublicId" TEXT NOT NULL,
    "mediaFileName" TEXT,
    "mediaMimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemoryAttachment_itemId_idx" ON "MemoryAttachment"("itemId");

-- CreateIndex
CREATE INDEX "MemoryAttachment_type_idx" ON "MemoryAttachment"("type");

-- AddForeignKey
ALTER TABLE "MemoryAttachment" ADD CONSTRAINT "MemoryAttachment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MemoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
