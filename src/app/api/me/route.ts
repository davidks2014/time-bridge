/**
 * API: GET /api/me
 *
 * Purpose:
 * - Return current logged-in user profile fields needed for routing:
 *   - role
 *   - verificationStatus
 *   - identificationNo (optional for debugging)
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

    const email = session.user.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        verificationStatus: true,
        verifiedAt: true,
        rejectReason: true,
        identificationNo: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    return Response.json({ user });
  } catch (err) {
    console.error("GET /api/me error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}