-- CreateEnum
CREATE TYPE "ProofOfLifeStage" AS ENUM ('NORMAL', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReceiverType" AS ENUM ('ADULT', 'CHILD', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "VisitOutcome" AS ENUM ('DELIVERED_AND_ACKNOWLEDGED', 'LEFT_LETTER_NO_ONE_HOME', 'ADDRESS_NOT_FOUND', 'PERSON_CONFIRMED_NOT_RECEIVER', 'REDIRECTED_TO_GUARDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL', 'SMS', 'GUARDIAN', 'TRUSTED_CONTACT', 'PHYSICAL_VISIT', 'ADMIN');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'PENDING');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('DATA_COLLECTION', 'LEGACY_DELIVERY', 'RECEIVER_CONTACT', 'TERMS_AND_PRIVACY');

-- AlterTable
ALTER TABLE "MemoryAttachment" ADD COLUMN     "mediaSizeBytes" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Receiver" ADD COLUMN     "guardianAddress" TEXT,
ADD COLUMN     "guardianEmail" TEXT,
ADD COLUMN     "guardianName" TEXT,
ADD COLUMN     "guardianNric" TEXT,
ADD COLUMN     "guardianPhone" TEXT,
ADD COLUMN     "receiverType" "ReceiverType" NOT NULL DEFAULT 'ADULT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "proofOfLifeStage" "ProofOfLifeStage" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "snoozedUntil" TIMESTAMP(3),
ADD COLUMN     "storageLimitBytes" BIGINT NOT NULL DEFAULT 52428800,
ADD COLUMN     "storageUsedBytes" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "trustedContactEmail" TEXT,
ADD COLUMN     "trustedContactName" TEXT,
ADD COLUMN     "trustedContactNric" TEXT,
ADD COLUMN     "trustedContactPhone" TEXT;

-- CreateTable
CREATE TABLE "VisitLog" (
    "id" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "outcome" "VisitOutcome" NOT NULL,
    "adminNotes" TEXT,
    "claimCode" TEXT,
    "claimCodeExpiresAt" TIMESTAMP(3),
    "conductedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "ipAddress" TEXT,
    "consentGivenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAttempt" (
    "id" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitLog_claimCode_key" ON "VisitLog"("claimCode");

-- CreateIndex
CREATE INDEX "VisitLog_receiverId_idx" ON "VisitLog"("receiverId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_performedBy_idx" ON "AuditLog"("performedBy");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_idx" ON "ConsentRecord"("userId");

-- CreateIndex
CREATE INDEX "ConsentRecord_consentType_idx" ON "ConsentRecord"("consentType");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_receiverId_idx" ON "DeliveryAttempt"("receiverId");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_channel_idx" ON "DeliveryAttempt"("channel");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_status_idx" ON "DeliveryAttempt"("status");

-- AddForeignKey
ALTER TABLE "VisitLog" ADD CONSTRAINT "VisitLog_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Receiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Receiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
