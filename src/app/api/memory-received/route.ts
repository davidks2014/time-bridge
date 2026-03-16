/**
 * API: GET /api/memory-received
 *
 * Purpose:
 * - For logged-in user (receiver), list items that have been RELEASED to them.
 *
 * Practical MVP receiver matching:
 * - receiver.linkedUserId == currentUser.id OR receiver.email == currentUser.email
 *
 * Output:
 * - Includes `sender` (owner of the memory card)
 * - Includes `releasedAt` (MVP: use item.updatedAt, because status becomes RELEASED during update)
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1) Must be logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const email = session.user.email.toLowerCase();

    // 2) Find current user id
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 3) Find released items for this receiver
    const items = await prisma.memoryItem.findMany({
      where: {
        status: "RELEASED",
        collection: {
          receiver: {
            OR: [{ linkedUserId: user.id }, { email }],
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        videoUrl: true,
        releaseDate: true,
        status: true,
        updatedAt: true, // we will use this as releasedAt (MVP)
        collection: {
          select: {
            id: true,
            title: true,
            owner: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // 4) Shape response for UI:
    // - sender: collection.owner
    // - releasedAt: updatedAt
    const uiItems = items.map((i) => ({
      id: i.id,
      type: i.type,
      title: i.title,
      content: i.content,
      videoUrl: i.videoUrl,
      releaseDate: i.releaseDate,
      status: i.status,
      releasedAt: i.updatedAt, // MVP released timestamp
      memory: {
        id: i.collection.id,
        title: i.collection.title,
      },
      sender: {
        name: i.collection.owner.name,
        email: i.collection.owner.email,
      },
    }));

    return Response.json({
      receivedCount: uiItems.length,
      items: uiItems,
    });
  } catch (err) {
    console.error("GET /api/memory-received error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}