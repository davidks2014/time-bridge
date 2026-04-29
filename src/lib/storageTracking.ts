/**
 * Storage Tracking Utility
 *
 * Purpose: Track user storage usage in the database.
 * Called after every file upload (increment) and
 * after every file delete (decrement).
 *
 * Storage is tracked in MB in the User table:
 * - storageUsedMB: how much the user has used
 * - storageLimitMB: their allowed limit (default 1024MB = 1GB)
 */

import { prisma } from "@/lib/prisma";

/**
 * Add to user's storage usage after successful upload
 * @param userId - User's database ID
 * @param sizeMB - File size in megabytes to add
 */
export async function incrementStorage(
  userId: string,
  sizeMB: number
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { storageUsedMB: { increment: sizeMB } },
  });
}

/**
 * Subtract from user's storage usage after file delete.
 * Uses raw SQL to prevent negative values — Prisma's decrement
 * can go below zero if the stored value is already 0.
 * @param userId - User's database ID
 * @param sizeMB - File size in megabytes to subtract
 */
export async function decrementStorage(
  userId: string,
  sizeMB: number
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User"
    SET "storageUsedMB" = GREATEST(0, "storageUsedMB" - ${sizeMB})
    WHERE id = ${userId}
  `;
}

/**
 * Get user's current storage usage and limit
 * @param userId - User's database ID
 * @returns { storageUsedMB, storageLimitMB } or null if user not found
 */
export async function getStorageInfo(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      storageUsedMB: true,
      storageLimitMB: true,
    },
  });
}
