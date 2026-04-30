/**
 * Storage Tracking Utility
 *
 * Purpose: Track user storage usage in the database.
 * Called after every file upload (increment) and
 * after every file delete (decrement).
 *
 * Storage is tracked in bytes in the User table:
 * - storageUsedBytes: how much the user has used
 * - storageLimitBytes: their allowed limit
 */

import { prisma } from "@/lib/prisma";

/**
 * Add to user's storage usage after successful upload.
 * @param userId    - User's database ID
 * @param sizeBytes - File size in bytes to add
 */
export async function incrementStorage(
  userId: string,
  sizeBytes: number
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { storageUsedBytes: { increment: BigInt(sizeBytes) } },
  });
}

/**
 * Subtract from user's storage usage after file delete.
 * Uses raw SQL to prevent negative values — Prisma's decrement
 * can go below zero if the stored value is already 0.
 * @param userId    - User's database ID
 * @param sizeBytes - File size in bytes to subtract
 */
export async function decrementStorage(
  userId: string,
  sizeBytes: number
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User"
    SET "storageUsedBytes" = GREATEST(0, "storageUsedBytes" - ${BigInt(sizeBytes)})
    WHERE id = ${userId}
  `;
}

/**
 * Get user's current storage usage and limit.
 * @param userId - User's database ID
 * @returns { storageUsedBytes, storageLimitBytes } or null if user not found
 */
export async function getStorageInfo(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      storageUsedBytes: true,
      storageLimitBytes: true,
    },
  });
}
