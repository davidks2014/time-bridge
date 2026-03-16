/**
 * API: GET /api/incoming-memory
 *
 * Incoming = NOT released yet (status = DRAFT)
 *
 * Receiver matching:
 * - linkedUserId == currentUser.id  OR  receiver.email == currentUser.email
 *
 * Security:
 * - Do NOT return content/videoUrl (receiver cannot see before release)
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

    const email = session.user.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const items = await prisma.memoryItem.findMany({
      where: {
        status: "DRAFT",
        collection: {
          receiver: {
            OR: [{ linkedUserId: user.id }, { email }],
          },
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        title: true,
        releaseDate: true,
        createdAt: true,
        collection: {
          select: {
            id: true,
            title: true,
            owner: { select: { email: true, name: true } },
          },
        },
      },
    });

    return Response.json({
      incomingCount: items.length,
      items,
    });
  } catch (err) {
    console.error("GET /api/incoming-memory error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}