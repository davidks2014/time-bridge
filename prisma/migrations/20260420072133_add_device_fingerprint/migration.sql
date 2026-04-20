-- CreateTable
CREATE TABLE "DeviceFingerprint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fingerprintHash" TEXT NOT NULL,
    "deviceLabel" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceFingerprint_userId_idx" ON "DeviceFingerprint"("userId");

-- CreateIndex
CREATE INDEX "DeviceFingerprint_flagged_idx" ON "DeviceFingerprint"("flagged");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceFingerprint_userId_fingerprintHash_key" ON "DeviceFingerprint"("userId", "fingerprintHash");

-- AddForeignKey
ALTER TABLE "DeviceFingerprint" ADD CONSTRAINT "DeviceFingerprint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
