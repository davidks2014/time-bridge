/**
 * src/app/api/memory/view/route.ts
 *
 * POST — mark a memory item as viewed by the receiver
 *
 * Purpose:
 * - Called when receiver explicitly opens a memory
 * - Sets viewedAt timestamp on the memory item
 * - Prevents recall after viewing (24-hour recall only works
 *   if receiver has not viewed yet)
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const body = await req.json();
    const itemId = String(body.itemId ?? "").trim();

    if (!itemId) {
      return Response.json({ error: "itemId is required." }, { status: 400 });
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });

    if (!me) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // Find the item and verify receiver has access
    const item = await prisma.memoryItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        status: true,
        viewedAt: true,
        collection: {
          select: {
            receiver: {
              select: { linkedUserId: true },
            },
          },
        },
      },
    });

    if (!item) {
      return Response.json({ error: "Memory item not found." }, { status: 404 });
    }

    // Verify receiver owns this memory
    if (item.collection.receiver.linkedUserId !== me.id) {
      return Response.json({ error: "Access denied." }, { status: 403 });
    }

    // Only mark as viewed if it is released
    if (item.status !== "RELEASED") {
      return Response.json({ error: "Memory is not yet released." }, { status: 400 });
    }

    // Only set viewedAt once — do not overwrite
    if (!item.viewedAt) {
      await prisma.memoryItem.update({
        where: { id: itemId },
        data: { viewedAt: new Date() },
      });
    }

    return Response.json({ message: "Memory marked as viewed." });

  } catch (err) {
    console.error("POST /api/memory/view error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
