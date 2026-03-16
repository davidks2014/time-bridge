/*
  Warnings:

  - Added the required column `identificationNo` to the `Receiver` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Receiver" ADD COLUMN     "identificationNo" TEXT NOT NULL;
