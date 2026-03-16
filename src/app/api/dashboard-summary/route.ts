import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/dashboard-summary
 *
 * Purpose:
 * - Provide counts for dashboard cards
 * - Provide proof-of-life stats for UI display
 *
 * IMPORTANT:
 * - incomingCount MUST match /api/incoming-memory
 * - For MVP, receiver is identified by receiver.email == currentUser.email
 */

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1) Must be logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const email = session.user.email.toLowerCase();

    // 2) Find user + proof-of-life values
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        missedConfirmations: true,
        lastConfirmedAt: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 3) Sender side: count memories (cards) created by this user
    const sentCount = await prisma.memoryCollection.count({
      where: { ownerId: user.id },
    });

    // 4) Receiver side (MVP): match by receiver.email (same as /incoming-memory)
    const receivedCount = await prisma.memoryItem.count({
      where: {
        status: "RELEASED",
        collection: {
          receiver: { email },
        },
      },
    });

    const incomingCount = await prisma.memoryItem.count({
      where: {
        status: "DRAFT",
        collection: {
          receiver: { email },
        },
      },
    });

    return Response.json({
      sentCount,
      receivedCount,
      incomingCount,
      missedConfirmations: user.missedConfirmations,
      lastConfirmedAt: user.lastConfirmedAt,
    });
  } catch (err) {
    console.error("dashboard-summary error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}