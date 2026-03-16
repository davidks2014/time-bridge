import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/proof-of-life/confirm
 *
 * Purpose:
 * - User clicks "I'm Alive" button
 * - Reset missedConfirmations to 0
 * - Update lastConfirmedAt to now
 */

export async function POST() {
  try {
    // 1) Must be logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    // 2) Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 3) Reset proof-of-life counters
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastConfirmedAt: new Date(),
        missedConfirmations: 0,
      },
    });

    return Response.json({ message: "Proof-of-life confirmed." });
  } catch (err) {
    console.error("proof confirm error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}