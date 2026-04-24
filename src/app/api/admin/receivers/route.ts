/**
 * src/app/api/admin/receivers/route.ts
 *
 * GET — list all receivers with delivery and claim status
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

    const receivers = await prisma.receiver.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        identificationNo: true,
        email: true,
        phone: true,
        address: true,
        receiverType: true,
        linkedUserId: true,
        guardianName: true,
        guardianEmail: true,
        createdAt: true,
        owner: {
          select: { name: true, email: true },
        },
        linkedUser: {
          select: { name: true, email: true },
        },
        collections: {
          select: {
            id: true,
            title: true,
            items: {
              select: { id: true, status: true, releasedAt: true },
            },
          },
        },
        deliveryAttempts: {
          orderBy: { attemptedAt: "desc" },
          take: 1,
          select: {
            channel: true,
            status: true,
            attemptedAt: true,
          },
        },
        invites: {
          where: { usedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { token: true, createdAt: true },
        },
      },
    });

    const formatted = receivers.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      identificationNo: r.identificationNo,
      email: r.email,
      phone: r.phone,
      address: r.address,
      receiverType: r.receiverType,
      isClaimed: !!r.linkedUserId,
      linkedUser: r.linkedUser,
      guardianName: r.guardianName,
      guardianEmail: r.guardianEmail,
      senderName: r.owner?.name ?? null,
      senderEmail: r.owner?.email ?? null,
      createdAt: r.createdAt,
      collections: r.collections.map((c) => ({
        id: c.id,
        title: c.title,
        totalItems: c.items.length,
        releasedItems: c.items.filter((i) => i.status === "RELEASED").length,
        latestReleasedAt: c.items
          .filter((i) => i.releasedAt)
          .sort((a, b) =>
            new Date(b.releasedAt!).getTime() - new Date(a.releasedAt!).getTime()
          )[0]?.releasedAt ?? null,
      })),
      lastDeliveryAttempt: r.deliveryAttempts[0] ?? null,
      hasActiveInvite: r.invites.length > 0,
    }));

    return Response.json({ receivers: formatted });

  } catch (err) {
    console.error("GET /api/admin/receivers error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
