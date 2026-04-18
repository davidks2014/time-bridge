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
import { sendInviteDelivery } from "@/lib/invites";

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
    // This handles cases where cron fires twice — the second run finds
    // the same items but createOrReuseReceiverInvite prevents duplicate emails
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const newlyReleased = await prisma.memoryItem.findMany({
      where: {
        status: "RELEASED",
        // Find items released within the last 5 minutes
        releasedAt: { gte: fiveMinutesAgo },
        collection: {
          receiver: {
            // Only send to receivers who do not have an account yet
            linkedUserId: null,
          },
        },
      },
      select: {
        id: true,
        collection: {
          select: {
            // Collection ID for bounce alert reference
            id: true,
            // Collection title for email personalisation
            title: true,
            // Sender name for email personalisation
            owner: {
              select: { name: true },
            },
            // Receiver contact details for email delivery
            receiver: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                address: true,
                // NRIC for admin bounce alert identification
                identificationNo: true,
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

    let invitesCreatedOrReused = 0;

    // 6) Send invite emails for each newly released memory
    for (const item of newlyReleased) {
      const receiver = item.collection.receiver;
      const senderName = item.collection.owner?.name ?? "Someone";
      const collectionTitle = item.collection.title;
      const memoryCount = item.collection.items.length;

      // Skip if receiver already has an account — they can log in directly
      if (receiver.linkedUserId) continue;

      // createOrReuseReceiverInvite is idempotent — if an invite already exists
      // for this receiver it reuses the same token instead of creating a new one
      // This prevents duplicate emails if the engine runs twice
      const { invite } = await createOrReuseReceiverInvite(receiver.id);

      if (invite) {
        invitesCreatedOrReused += 1;

        // Send the release notification email
        // If delivery fails, admin bounce alert is sent automatically
        await sendInviteDelivery(
          {
            fullName: receiver.fullName,
            email: receiver.email,
            phone: receiver.phone,
            address: receiver.address,
            identificationNo: receiver.identificationNo,
          },
          senderName,
          invite.token,
          collectionTitle,
          memoryCount,
          item.collection.id
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
      newlyReleasedCount: newlyReleased.length,
      ranAt: now.toISOString(),
    });

  } catch (err) {
    console.error("run-release-engine error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
