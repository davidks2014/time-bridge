/*
  Warnings:

  - A unique constraint covering the columns `[inviteToken]` on the table `Receiver` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Receiver" ADD COLUMN     "inviteExpiresAt" TIMESTAMP(3),
ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "linkedUserId" TEXT,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Receiver_inviteToken_key" ON "Receiver"("inviteToken");

-- AddForeignKey
ALTER TABLE "Receiver" ADD CONSTRAINT "Receiver_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
