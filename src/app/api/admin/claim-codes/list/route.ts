/**
 * src/app/api/admin/claim-codes/list/route.ts
 *
 * GET — list all generated claim codes with status
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

    // Get all visit logs that have claim codes
    const visitLogs = await prisma.visitLog.findMany({
      where: { claimCode: { not: null } },
      orderBy: { visitDate: "desc" },
      select: {
        id: true,
        claimCode: true,
        claimCodeExpiresAt: true,
        visitDate: true,
        adminNotes: true,
        receiver: {
          select: {
            id: true,
            fullName: true,
            identificationNo: true,
            linkedUserId: true,
            email: true,
          },
        },
      },
    });

    const now = new Date();

    const codes = visitLogs.map((log) => {
      const isExpired = log.claimCodeExpiresAt
        ? log.claimCodeExpiresAt < now
        : false;
      const isClaimed = !!log.receiver.linkedUserId;

      let codeStatus: "ACTIVE" | "USED" | "EXPIRED";
      if (isClaimed) codeStatus = "USED";
      else if (isExpired) codeStatus = "EXPIRED";
      else codeStatus = "ACTIVE";

      return {
        id: log.id,
        claimCode: log.claimCode,
        claimCodeExpiresAt: log.claimCodeExpiresAt,
        visitDate: log.visitDate,
        adminNotes: log.adminNotes,
        status: codeStatus,
        receiver: {
          id: log.receiver.id,
          fullName: log.receiver.fullName,
          identificationNo: log.receiver.identificationNo,
          email: log.receiver.email,
          isClaimed: isClaimed,
        },
      };
    });

    return Response.json({ codes });

  } catch (err) {
    console.error("GET /api/admin/claim-codes/list error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
