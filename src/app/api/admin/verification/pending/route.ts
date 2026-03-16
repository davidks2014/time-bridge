/**
 * API: GET /api/admin/verification/pending
 *
 * Purpose:
 * - Admin lists users that are pending verification
 *
 * Security:
 * - Must be logged in
 * - Must have role = ADMIN
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1) Check session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    // 2) Check role from DB (do NOT trust client)
    const admin = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true, role: true },
    });

    if (!admin) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    if (admin.role !== "ADMIN") {
      return Response.json({ error: "Forbidden. Admin only." }, { status: 403 });
    }

    // 3) List users with PENDING verification
    const users = await prisma.user.findMany({
      where: { verificationStatus: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        identificationNo: true,
        address: true,
        verificationStatus: true,

        // ✅ NEW — include uploaded verification documents
        verificationDocFrontUrl: true,
        verificationDocBackUrl: true,

        createdAt: true,
      },
    });

    return Response.json({ users });
  } catch (err) {
    console.error("GET /api/admin/verification/pending error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}