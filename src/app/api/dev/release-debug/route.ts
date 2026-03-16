/**
 * DEV API: /api/dev/release-debug
 *
 * Purpose:
 * - Show server time
 * - Show what items exist in DB (top recent)
 * - Show why "eligibleByDate" is empty
 *
 * Supports:
 * - GET
 */

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();

    // A) What Prisma thinks is eligible by date
    const eligibleByDate = await prisma.memoryItem.findMany({
      where: {
        status: "DRAFT",
        releaseDate: { not: null, lte: now },
      },
      orderBy: { releaseDate: "asc" },
      select: {
        id: true,
        title: true,
        status: true,
        releaseDate: true,
        ownerId: true,
        collectionId: true,
      },
      take: 50,
    });

    // B) Show the most recent items (regardless of status/releaseDate)
    // This proves whether you're reading the same DB + what fields look like.
    const latestItems = await prisma.memoryItem.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        status: true,
        releaseDate: true,
        releasedAt: true, // if column exists
        ownerId: true,
        collectionId: true,
        createdAt: true,
      },
    });

    // C) All DRAFT items that have a releaseDate (even if > now)
    const draftWithReleaseDate = await prisma.memoryItem.findMany({
      where: {
        status: "DRAFT",
        releaseDate: { not: null },
      },
      orderBy: { releaseDate: "asc" },
      take: 50,
      select: {
        id: true,
        title: true,
        status: true,
        releaseDate: true,
        ownerId: true,
        collectionId: true,
      },
    });

    // D) Users with miss >= 6 (for "miss rule")
    const usersWithMiss6 = await prisma.user.findMany({
      where: { missedConfirmations: { gte: 6 } },
      select: { id: true, email: true, missedConfirmations: true },
      take: 50,
    });

    // E) DRAFT items eligible by miss rule (releaseDate must be null)
    const eligibleByMiss = await prisma.memoryItem.findMany({
      where: {
        status: "DRAFT",
        releaseDate: null,
        ownerId: { in: usersWithMiss6.map((u) => u.id) },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        status: true,
        releaseDate: true,
        ownerId: true,
        collectionId: true,
      },
    });

    return Response.json({
      serverNowIso: now.toISOString(),

      eligibleByDateCount: eligibleByDate.length,
      eligibleByDate,

      latestItemsCount: latestItems.length,
      latestItems,

      draftWithReleaseDateCount: draftWithReleaseDate.length,
      draftWithReleaseDate,

      usersWithMiss6Count: usersWithMiss6.length,
      usersWithMiss6,

      eligibleByMissCount: eligibleByMiss.length,
      eligibleByMiss,
    });
  } catch (err) {
    console.error("release-debug GET error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}