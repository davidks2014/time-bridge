/**
 * src/app/api/admin/stats/route.ts
 *
 * GET — admin dashboard stats
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true, role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return Response.json({ error: "Admin only." }, { status: 403 });
    }

    const [
      totalUsers,
      pendingVerifications,
      totalMemories,
      releasedMemories,
      totalReceivers,
      unclaimedReceivers,
      deliveryFailed,
      totalVisitLogs,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.user.count({ where: { verificationStatus: "PENDING" } }),
      prisma.memoryItem.count(),
      prisma.memoryItem.count({ where: { status: "RELEASED" } }),
      prisma.receiver.count(),
      prisma.receiver.count({ where: { linkedUserId: null } }),
      prisma.deliveryAttempt.count({ where: { status: "FAILED" } }),
      prisma.visitLog.count(),
    ]);

    return Response.json({
      stats: {
        totalUsers,
        pendingVerifications,
        totalMemories,
        releasedMemories,
        totalReceivers,
        unclaimedReceivers,
        deliveryFailed,
        totalVisitLogs,
      },
    });

  } catch (err) {
    console.error("GET /api/admin/stats error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
