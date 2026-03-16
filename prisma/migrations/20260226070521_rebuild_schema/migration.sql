/*
  Warnings:

  - The values [RELEASED] on the enum `CollectionStatus` will be removed. If these variants are still used in the database, this will fail.
  - The `status` column on the `MemoryItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `passwordHash` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "MemoryItemStatus" AS ENUM ('DRAFT', 'RELEASED');

-- AlterEnum
BEGIN;
CREATE TYPE "CollectionStatus_new" AS ENUM ('DRAFT', 'ACTIVE');
ALTER TABLE "public"."MemoryCollection" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MemoryCollection" ALTER COLUMN "status" TYPE "CollectionStatus_new" USING ("status"::text::"CollectionStatus_new");
ALTER TYPE "CollectionStatus" RENAME TO "CollectionStatus_old";
ALTER TYPE "CollectionStatus_new" RENAME TO "CollectionStatus";
DROP TYPE "public"."CollectionStatus_old";
ALTER TABLE "MemoryCollection" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "MemoryItem" DROP COLUMN "status",
ADD COLUMN     "status" "MemoryItemStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "passwordHash" SET NOT NULL;

-- DropEnum
DROP TYPE "ItemStatus";

-- CreateIndex
CREATE INDEX "MemoryItem_ownerId_idx" ON "MemoryItem"("ownerId");

-- CreateIndex
CREATE INDEX "MemoryItem_collectionId_idx" ON "MemoryItem"("collectionId");

-- CreateIndex
CREATE INDEX "MemoryItem_releaseDate_idx" ON "MemoryItem"("releaseDate");
