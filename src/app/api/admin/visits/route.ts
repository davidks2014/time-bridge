/**
 * src/app/api/admin/visits/route.ts
 *
 * GET — list all visit logs
 * POST — record a new physical visit
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

    const visits = await prisma.visitLog.findMany({
      orderBy: { visitDate: "desc" },
      select: {
        id: true,
        visitDate: true,
        outcome: true,
        adminNotes: true,
        claimCode: true,
        claimCodeExpiresAt: true,
        conductedBy: true,
        createdAt: true,
        receiver: {
          select: {
            id: true,
            fullName: true,
            identificationNo: true,
            email: true,
            address: true,
            linkedUserId: true,
          },
        },
      },
    });

    return Response.json({ visits });

  } catch (err) {
    console.error("GET /api/admin/visits error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true, role: true, name: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return Response.json({ error: "Admin only." }, { status: 403 });
    }

    const body = await req.json();
    const receiverId = String(body.receiverId ?? "").trim();
    const outcome = String(body.outcome ?? "OTHER").trim().toUpperCase();
    const adminNotes = String(body.adminNotes ?? "").trim();
    const visitDate = body.visitDate ? new Date(body.visitDate) : new Date();

    if (!receiverId) {
      return Response.json({ error: "receiverId is required." }, { status: 400 });
    }

    // Verify receiver exists
    const receiver = await prisma.receiver.findUnique({
      where: { id: receiverId },
      select: { id: true, fullName: true },
    });

    if (!receiver) {
      return Response.json({ error: "Receiver not found." }, { status: 404 });
    }

    const visit = await prisma.visitLog.create({
      data: {
        receiverId,
        visitDate,
        outcome: outcome as any,
        adminNotes: adminNotes || null,
        conductedBy: admin.id,
      },
    });

    return Response.json({
      message: "Visit recorded successfully.",
      visitId: visit.id,
    });

  } catch (err) {
    console.error("POST /api/admin/visits error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
