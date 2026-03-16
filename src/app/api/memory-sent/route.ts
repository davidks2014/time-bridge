/**
 * API: GET /api/memory-sent
 *
 * Purpose:
 * - Logged-in user (sender) lists all memories they created:
 *   - MemoryCollection (card)
 *   - MemoryItem(s) inside each card
 *   - Receiver information
 *
 * Notes:
 * - MemoryCollection.status REMOVED (Option 1)
 * - Lock state is derived on UI side (if any item RELEASED)
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

    // 2) Current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 3) Fetch all memories + items + receiver
    const collections = await prisma.memoryCollection.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        receiver: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            address: true,
            identificationNo: true,
          },
        },
        items: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            title: true,
            releaseDate: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return Response.json({ collections });
  } catch (err) {
    console.error("GET /api/memory-sent error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}