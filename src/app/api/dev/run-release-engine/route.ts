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
 *   create/reuse invitation token and attempt multi-channel delivery
 */

import { prisma } from "@/lib/prisma";
import { createOrReuseReceiverInvite } from "@/lib/invites";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const now = new Date();

    // 1) Release items by date
    const byDate = await prisma.memoryItem.updateMany({
      where: {
        status: "DRAFT",
        releaseDate: { not: null, lte: now },
      },
      data: {
        status: "RELEASED",
        releasedAt: now,
      },
    });

    // 2) Release items by missed confirmations
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
        releasedAt: now,
      },
    });

    // 3) Find newly released items that still need invitations
    const newlyReleased = await prisma.memoryItem.findMany({
      where: {
        status: "RELEASED",
        releasedAt: now,
        collection: {
          receiver: { linkedUserId: null },
        },
      },
      select: {
        id: true,
        collection: {
          select: {
            id: true,
            title: true,
            owner: {
              select: {
                id: true,
                name: true,
                trustedContactName: true,
                trustedContactEmail: true,
              },
            },
            receiver: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                address: true,
                identificationNo: true,
                receiverType: true,
                guardianName: true,
                guardianEmail: true,
                guardianPhone: true,
                guardianAddress: true,
                linkedUserId: true,
              },
            },
            items: {
              where: { status: "RELEASED" },
              select: { id: true },
            },
          },
        },
      },
    });

    // 4) Create/reuse invites + multi-channel delivery
    const { deliverMemoryNotification } = await import("@/lib/delivery-queue");

    let invitesCreatedOrReused = 0;
    let deliverySucceeded = 0;
    let deliveryFailed = 0;

    for (const item of newlyReleased) {
      const receiver = item.collection.receiver;
      const sender = item.collection.owner;

      if (receiver.linkedUserId) continue;

      const { invite } = await createOrReuseReceiverInvite(receiver.id);

      if (!invite) continue;

      invitesCreatedOrReused += 1;

      const result = await deliverMemoryNotification({
        receiver: {
          id: receiver.id,
          fullName: receiver.fullName,
          email: receiver.email || null,
          phone: receiver.phone || null,
          address: receiver.address,
          identificationNo: receiver.identificationNo,
          receiverType: receiver.receiverType,
          guardianName: receiver.guardianName || null,
          guardianEmail: receiver.guardianEmail || null,
          guardianPhone: receiver.guardianPhone || null,
          guardianAddress: receiver.guardianAddress || null,
        },
        sender: {
          id: sender.id,
          name: sender.name,
          trustedContactName: sender.trustedContactName || null,
          trustedContactEmail: sender.trustedContactEmail || null,
        },
        inviteToken: invite.token,
        collectionId: item.collection.id,
        collectionTitle: item.collection.title,
        memoryCount: item.collection.items.length,
      });

      if (result.success) {
        deliverySucceeded += 1;
      } else {
        deliveryFailed += 1;
      }
    }

    return Response.json({
      message: "Release engine completed.",
      releasedByDate: byDate.count,
      releasedByMissedConfirmations: byMiss.count,
      totalReleased: byDate.count + byMiss.count,
      invitesCreatedOrReused,
      deliverySucceeded,
      deliveryFailed,
      newlyReleasedCount: newlyReleased.length,
    });
  } catch (err) {
    console.error("Release engine error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
