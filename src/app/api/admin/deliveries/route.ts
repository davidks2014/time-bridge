/**
 * src/app/api/admin/deliveries/route.ts
 *
 * GET — list all delivery attempts across all receivers
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") ?? "ALL";

    const where = statusFilter !== "ALL"
      ? { status: statusFilter as any }
      : {};

    const attempts = await prisma.deliveryAttempt.findMany({
      where,
      orderBy: { attemptedAt: "desc" },
      take: 100,
      select: {
        id: true,
        channel: true,
        status: true,
        notes: true,
        attemptedAt: true,
        receiver: {
          select: {
            id: true,
            fullName: true,
            identificationNo: true,
            email: true,
            linkedUserId: true,
          },
        },
      },
    });

    return Response.json({ attempts });

  } catch (err) {
    console.error("GET /api/admin/deliveries error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
