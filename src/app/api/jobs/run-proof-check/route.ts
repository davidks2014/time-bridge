import { prisma } from "@/lib/prisma";

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

    const users = await prisma.user.findMany({
      select: {
        id: true,
        createdAt: true,
        lastConfirmedAt: true,
        confirmationIntervalDays: true,
        missedConfirmations: true,
      },
    });

    let updatedUsers = 0;

    for (const user of users) {
      const intervalDays = user.confirmationIntervalDays || 30;

      // If user never confirmed before, use account creation time as first anchor
      const anchor = user.lastConfirmedAt ?? user.createdAt;

      const nextDue = new Date(anchor);
      nextDue.setDate(nextDue.getDate() + intervalDays);

      if (now > nextDue) {
        // Move anchor forward by one interval so the same missed cycle
        // is not counted again immediately on the next run.
        const bumpedAnchor = new Date(anchor);
        bumpedAnchor.setDate(bumpedAnchor.getDate() + intervalDays);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            missedConfirmations: user.missedConfirmations + 1,
            lastConfirmedAt: bumpedAnchor,
          },
        });

        updatedUsers += 1;
      }
    }

    return Response.json({
      message: "Proof-of-life check completed.",
      updatedUsers,
      ranAt: now.toISOString(),
    });
  } catch (err) {
    console.error("run-proof-check error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}