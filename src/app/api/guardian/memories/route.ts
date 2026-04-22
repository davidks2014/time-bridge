/**
 * src/app/api/guardian/memories/route.ts
 *
 * GET — returns all receiver records where the logged-in user is the guardian
 *
 * Purpose:
 * - Guardian can see which children's memories they are holding
 * - Only returns receivers with receiverType CHILD or UNKNOWN
 * - Shows released collections so guardian knows what is waiting
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

    const me = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });

    if (!me) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // Find all receivers where this user is the linked guardian
    const receivers = await prisma.receiver.findMany({
      where: {
        linkedUserId: me.id,
        receiverType: { in: ["CHILD", "UNKNOWN"] },
      },
      select: {
        id: true,
        fullName: true,
        identificationNo: true,
        receiverType: true,
        collections: {
          where: {
            items: { some: { status: "RELEASED" } },
          },
          select: {
            id: true,
            title: true,
            owner: { select: { name: true } },
            items: {
              where: { status: "RELEASED" },
              orderBy: { releasedAt: "desc" },
              take: 1,
              select: { releasedAt: true },
            },
            _count: {
              select: { items: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const memories = receivers.map((receiver) => ({
      receiverId: receiver.id,
      receiverName: receiver.fullName,
      receiverNric: receiver.identificationNo,
      receiverType: receiver.receiverType,
      collections: receiver.collections.map((col) => ({
        id: col.id,
        title: col.title,
        senderName: col.owner?.name ?? "Someone",
        itemCount: col._count.items,
        releasedAt: col.items[0]?.releasedAt ?? null,
      })),
    }));

    return Response.json({ memories });

  } catch (err) {
    console.error("GET /api/guardian/memories error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
