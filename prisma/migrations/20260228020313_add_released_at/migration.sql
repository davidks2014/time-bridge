-- AlterTable
ALTER TABLE "MemoryItem" ADD COLUMN     "releasedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "MemoryItem_releasedAt_idx" ON "MemoryItem"("releasedAt");
