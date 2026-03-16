-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "missedConfirmations" INTEGER NOT NULL DEFAULT 0;
