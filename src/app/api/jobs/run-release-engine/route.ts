/**
 * src/app/api/jobs/run-release-engine/route.ts
 *
 * Purpose:
 * - Runs on a schedule via Vercel cron (see vercel.json)
 * - Releases memories that have reached their release date
 * - Releases memories where owner has missed too many confirmations
 * - Sends invite emails to receivers after release
 *
 * Idempotency design:
 * - Uses a 5-minute time window instead of exact timestamp matching
 * - This prevents double-processing if cron fires twice in quick succession
 * - updateMany only touches DRAFT items so already-released items are never touched again
 * - createOrReuseReceiverInvite reuses existing tokens so no duplicate emails
 *
 * Auth:
 * - Bearer CRON_SECRET for manual testing via Thunder Client
 * - x-vercel-cron header for Vercel automatic cron runs
 */

import { prisma } from "@/lib/prisma";
import { createOrReuseReceiverInvite } from "@/lib/invites";

export const dynamic = "force-dynamic";

// ─── Auth check ───────────────────────────────────────────────────────────────

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization")?.trim();
  const vercelCronHeader = req.headers.get("x-vercel-cron");

  return (
    authHeader === `Bearer ${secret}` ||
    vercelCronHeader === "1"
  );
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    // 1) Check CRON_SECRET is configured
    if (!process.env.CRON_SECRET) {
      return Response.json(
        { error: "CRON_SECRET is not configured." },
        { status: 500 }
      );
    }

    // 2) Reject unauthorized requests
    if (!isAuthorized(req)) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const now = new Date();

    // 3) Release items that have reached their fixed release date
    // Only DRAFT items are touched — already released items are never re-processed
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

    // 4) Release items where owner has missed 6 or more proof-of-life confirmations
    // Only items with no fixed release date use this rule
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

    // 5) Find items released in this run that need invite delivery
    // Idempotency: use a 5-minute window instead of exact timestamp
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const newlyReleased = await prisma.memoryItem.findMany({
      where: {
        status: "RELEASED",
        releasedAt: { gte: fiveMinutesAgo },
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
            // Sender details for trusted contact escalation
            owner: {
              select: {
                id: true,
                name: true,
                trustedContactName: true,
                trustedContactEmail: true,
              },
            },
            // Receiver details for all delivery channels
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
            // Count released items for email context
            items: {
              where: { status: "RELEASED" },
              select: { id: true },
            },
          },
        },
      },
    });

    // Import delivery queue
    const { deliverMemoryNotification } = await import("@/lib/delivery-queue");

    let invitesCreatedOrReused = 0;
    let deliverySucceeded = 0;
    let deliveryFailed = 0;

    // 6) Process each newly released memory
    for (const item of newlyReleased) {
      const receiver = item.collection.receiver;
      const sender = item.collection.owner;

      // Skip if receiver already has an account — they can log in directly
      if (receiver.linkedUserId) continue;

      // Create or reuse invite token
      const { invite } = await createOrReuseReceiverInvite(receiver.id);

      if (!invite) continue;

      invitesCreatedOrReused += 1;

      // Attempt multi-channel delivery
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
        console.log(
          `[release-engine] Delivered via ${result.channel} for receiver ${receiver.id}`
        );
      } else {
        deliveryFailed += 1;
        console.error(
          `[release-engine] All delivery channels failed for receiver ${receiver.id}`
        );
      }
    }

    // 7) Return summary of this run
    return Response.json({
      message: "Release engine completed.",
      releasedByDate: byDate.count,
      releasedByMissedConfirmations: byMiss.count,
      totalReleased: byDate.count + byMiss.count,
      invitesCreatedOrReused,
      deliverySucceeded,
      deliveryFailed,
      newlyReleasedCount: newlyReleased.length,
      ranAt: now.toISOString(),
    });

  } catch (err) {
    console.error("run-release-engine error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}

/**
 * GET handler for Vercel Cron
 * Vercel cron sends GET requests — this forwards to the POST logic
 */
export async function GET(req: Request) {
  return POST(req);
}
