/*
  Warnings:

  - You are about to drop the `LegacyItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LegacyPackage` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RELEASED');

-- DropForeignKey
ALTER TABLE "LegacyItem" DROP CONSTRAINT "LegacyItem_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "LegacyItem" DROP CONSTRAINT "LegacyItem_packageId_fkey";

-- DropForeignKey
ALTER TABLE "LegacyPackage" DROP CONSTRAINT "LegacyPackage_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "LegacyPackage" DROP CONSTRAINT "LegacyPackage_receiverId_fkey";

-- DropTable
DROP TABLE "LegacyItem";

-- DropTable
DROP TABLE "LegacyPackage";

-- DropEnum
DROP TYPE "PackageStatus";

-- CreateTable
CREATE TABLE "MemoryCollection" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CollectionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "videoUrl" TEXT,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MemoryCollection" ADD CONSTRAINT "MemoryCollection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryCollection" ADD CONSTRAINT "MemoryCollection_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Receiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryItem" ADD CONSTRAINT "MemoryItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "MemoryCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryItem" ADD CONSTRAINT "MemoryItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
