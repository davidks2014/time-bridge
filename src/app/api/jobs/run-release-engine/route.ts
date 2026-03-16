import { prisma } from "@/lib/prisma";
import { createOrReuseReceiverInvite, logInviteDelivery } from "@/lib/invites";

export const dynamic = "force-dynamic";

/**
 * Auth for:
 * - local/manual testing via Thunder Client
 * - future scheduler calls using the same bearer secret
 */
function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization")?.trim();
  return authHeader === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  try {
    if (!process.env.CRON_SECRET) {
      return Response.json(
        { error: "CRON_SECRET is not configured." },
        { status: 500 }
      );
    }

    if (!isAuthorized(req)) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const now = new Date();

    // 1) Release items that reached fixed releaseDate
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

    // 2) Release items that depend on proof-of-life
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

    // 3) Find items released in this run that still need invite delivery
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
        collection: {
          select: {
            title: true,
            receiver: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                address: true,
                linkedUserId: true,
              },
            },
          },
        },
      },
    });

    let invitesCreatedOrReused = 0;

    for (const item of newlyReleased) {
      const receiver = item.collection.receiver;

      if (receiver.linkedUserId) continue;

      const { invite } = await createOrReuseReceiverInvite(receiver.id);

      if (invite) {
        invitesCreatedOrReused += 1;

        logInviteDelivery(
          {
            fullName: receiver.fullName,
            email: receiver.email,
            phone: receiver.phone,
            address: receiver.address,
          },
          invite.token
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
      ranAt: now.toISOString(),
    });
  } catch (err) {
    console.error("run-release-engine error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}