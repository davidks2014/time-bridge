/**
 * src/app/api/admin/memories/route.ts
 *
 * GET — list all memory collections across all users
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

    const collections = await prisma.memoryCollection.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            verificationStatus: true,
            proofOfLifeStage: true,
          },
        },
        receiver: {
          select: {
            id: true,
            fullName: true,
            identificationNo: true,
            email: true,
            receiverType: true,
            linkedUserId: true,
          },
        },
        items: {
          select: {
            id: true,
            title: true,
            status: true,
            releaseDate: true,
            releasedAt: true,
            viewedAt: true,
          },
        },
      },
    });

    // Filter by status if requested
    const filtered = collections.filter((c) => {
      if (statusFilter === "ALL") return true;
      if (statusFilter === "DRAFT") return c.items.every((i) => i.status === "DRAFT");
      if (statusFilter === "RELEASED") return c.items.some((i) => i.status === "RELEASED");
      if (statusFilter === "VIEWED") return c.items.some((i) => i.viewedAt);
      return true;
    });

    const formatted = filtered.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      sender: {
        id: c.owner.id,
        name: c.owner.name,
        email: c.owner.email,
        verificationStatus: c.owner.verificationStatus,
        proofOfLifeStage: c.owner.proofOfLifeStage,
      },
      receiver: {
        id: c.receiver.id,
        fullName: c.receiver.fullName,
        identificationNo: c.receiver.identificationNo,
        email: c.receiver.email,
        receiverType: c.receiver.receiverType,
        isClaimed: !!c.receiver.linkedUserId,
      },
      items: c.items.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        releaseDate: i.releaseDate,
        releasedAt: i.releasedAt,
        viewedAt: i.viewedAt,
      })),
      totalItems: c.items.length,
      releasedItems: c.items.filter((i) => i.status === "RELEASED").length,
      viewedItems: c.items.filter((i) => i.viewedAt).length,
    }));

    return Response.json({ collections: formatted });

  } catch (err) {
    console.error("GET /api/admin/memories error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
