/*
  Warnings:

  - You are about to drop the column `status` on the `MemoryCollection` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MemoryCollection" DROP COLUMN "status";

-- DropEnum
DROP TYPE "CollectionStatus";
