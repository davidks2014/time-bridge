/**
 * Storage Tracking Utility
 *
 * Purpose: Track user storage usage in the database.
 * Called after every file upload (increment) and
 * after every file delete (decrement).
 *
 * Storage is tracked in MB in the User table:
 * - storageUsedMB: how much the user has used (Float)
 * - storageLimitMB: their allowed limit (Float, default 1024 MB = 1 GB)
 */

import { prisma } from "@/lib/prisma";

/**
 * Add to user's storage usage after a successful upload.
 * Uses Prisma's { increment } — safe for additive updates.
 * @param userId - User's database ID
 * @param sizeMB - File size in megabytes to add (Float)
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
 * Subtract from user's storage usage after a file delete.
 * Uses raw SQL with GREATEST(0, ...) to prevent the value going below zero —
 * Prisma's { decrement } can push a Float negative if the field is already 0.
 * @param userId - User's database ID
 * @param sizeMB - File size in megabytes to subtract (Float)
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
 * Get user's current storage usage and limit in MB.
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
