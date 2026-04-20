/**
 * src/app/api/proof-of-life/confirm/route.ts
 *
 * Purpose:
 * - User clicks "I'm Alive" button on dashboard
 * - Reset missedConfirmations to 0
 * - Reset proofOfLifeStage to NORMAL
 * - Update lastConfirmedAt to now
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // Reset all proof-of-life counters and stage
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastConfirmedAt: new Date(),
        missedConfirmations: 0,
        // Reset stage to NORMAL — sender has confirmed they are alive
        proofOfLifeStage: "NORMAL",
      },
    });

    return Response.json({ message: "Proof-of-life confirmed. Stage reset to NORMAL." });

  } catch (err) {
    console.error("proof confirm error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
