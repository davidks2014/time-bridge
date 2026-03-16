/*
  Warnings:

  - You are about to drop the `Messages` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Messages" DROP CONSTRAINT "Messages_ownerId_fkey";

-- DropTable
DROP TABLE "Messages";

-- DropEnum
DROP TYPE "MessageStatus";
