/**
 * src/app/api/dev/run-release-engine/route.ts
 *
 * DEV ONLY
 *
 * Purpose:
 * - Simulate "release engine" for MVP testing.
 *
 * Release rules:
 * 1) If releaseDate is set and <= now -> release
 * 2) If releaseDate is NULL:
 *    - release only when owner's missedConfirmations >= 6
 *
 * After releasing:
 * - If receiver is NOT registered yet (receiver.linkedUserId is null)
 *   create/reuse invitation token and "send" (console.log for MVP)
 */

import { prisma } from "@/lib/prisma";
import { createOrReuseReceiverInvite, sendInviteDelivery } from "@/lib/invites";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const now = new Date();

    /**
     * 1) Release items by date (releaseDate NOT NULL and <= now)
     * - Only items still in DRAFT
     */
    const byDate = await prisma.memoryItem.updateMany({
      where: {
        status: "DRAFT",
        releaseDate: { not: null, lte: now },
      },
      data: {
        status: "RELEASED",
        releasedAt: now, // ✅ actual release timestamp
      },
    });

    /**
     * 2) Release items by missed confirmations (only if releaseDate is NULL)
     * - Owner missedConfirmations >= 6
     */
    const byMiss = await prisma.memoryItem.updateMany({
      where: {
        status: "DRAFT",
        releaseDate: null,
        owner: {
          missedConfirmations: { gte: 6 },
        },
      },
      data: {
        status: "RELEASED",
        releasedAt: now, // ✅ actual release timestamp
      },
    });

    /**
     * 3) Find newly released items that still need invitations
     * - receiver.linkedUserId is null => receiver not registered
     * - item.status = RELEASED
     * - item.releasedAt = now (we use this run timestamp to detect "new")
     *
     * NOTE:
     * - In production you'd use a job runner + more robust "just released" detection.
     * - For MVP this is enough.
     */
    const newlyReleased = await prisma.memoryItem.findMany({
      where: {
        status: "RELEASED",
        releasedAt: now,
        collection: {
          receiver: {
            linkedUserId: null,
          },
        },
      },
      select: {
        id: true,
        owner: {
          select: { name: true },
        },
        collection: {
          select: {
            id: true,
            title: true,
            receiver: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                address: true,
                identificationNo: true,
                linkedUserId: true,
              },
            },
          },
        },
      },
    });

    /**
     * 4) Create/reuse invites + "send"
     */
    let invitesCreatedOrReused = 0;

    for (const item of newlyReleased) {
      const receiver = item.collection.receiver;

      // Safety check (should already be null from query filter)
      if (receiver.linkedUserId) continue;

      const { invite } = await createOrReuseReceiverInvite(receiver.id);

      if (invite) {
        invitesCreatedOrReused += 1;

        await sendInviteDelivery(
          receiver,
          invite.token,
          item.owner.name
        );
      }
    }

    return Response.json({
      message: "Release engine completed.",
      releasedByDate: byDate.count,
      releasedByMissedConfirmations: byMiss.count,
      totalReleased: byDate.count + byMiss.count,
      invitesCreatedOrReused,
      newlyReleasedCount: newlyReleased.length,
    });
  } catch (err) {
    console.error("Release engine error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}