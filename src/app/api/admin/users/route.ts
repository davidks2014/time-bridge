/**
 * src/app/api/admin/users/route.ts
 *
 * GET — list all users
 * PATCH — update user role or verification status
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

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        verificationStatus: true,
        identificationNo: true,
        phoneNumber: true,
        proofOfLifeStage: true,
        lastConfirmedAt: true,
        missedConfirmations: true,
        createdAt: true,
        _count: {
          select: {
            collections: true,
          },
        },
      },
    });

    return Response.json({ users });

  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
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

    const body = await req.json();
    const userId = String(body.userId ?? "").trim();
    const action = String(body.action ?? "").trim();

    if (!userId || !action) {
      return Response.json({ error: "userId and action are required." }, { status: 400 });
    }

    // Prevent admin from modifying themselves
    if (userId === admin.id) {
      return Response.json({ error: "Cannot modify your own account." }, { status: 400 });
    }

    if (action === "FORCE_APPROVE") {
      await prisma.user.update({
        where: { id: userId },
        data: { verificationStatus: "APPROVED" },
      });
      return Response.json({ message: "User approved successfully." });
    }

    if (action === "FORCE_REJECT") {
      await prisma.user.update({
        where: { id: userId },
        data: { verificationStatus: "REJECTED" },
      });
      return Response.json({ message: "User rejected successfully." });
    }

    if (action === "RESET_PROOF") {
      await prisma.user.update({
        where: { id: userId },
        data: {
          proofOfLifeStage: "NORMAL",
          missedConfirmations: 0,
          lastConfirmedAt: new Date(),
        },
      });
      return Response.json({ message: "Proof-of-life reset successfully." });
    }

    return Response.json({ error: "Invalid action." }, { status: 400 });

  } catch (err) {
    console.error("PATCH /api/admin/users error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
