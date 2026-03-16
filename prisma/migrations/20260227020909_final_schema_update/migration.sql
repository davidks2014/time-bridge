-- CreateTable
CREATE TABLE "ReceiverInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "receiverEmail" TEXT NOT NULL,
    "receiverName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "ReceiverInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReceiverInvite_token_key" ON "ReceiverInvite"("token");

-- AddForeignKey
ALTER TABLE "ReceiverInvite" ADD CONSTRAINT "ReceiverInvite_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Receiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
