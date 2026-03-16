/**
 * API: /api/memory-sent/[memoryId]
 *
 * Purpose:
 * - GET    : Get 1 memory (collection/card) with receiver + items (owner only)
 * - DELETE : Delete the whole memory (owner only) and cascade delete items
 *
 * Rules:
 * - If ANY item is already RELEASED => sender cannot delete this memory
 *
 * Notes:
 * - MemoryCollection.status REMOVED (Option 1)
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { MemoryItemStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// Next.js 16: params is a Promise
type Params = { params: Promise<{ memoryId: string }> };

/**
 * GET /api/memory-sent/[memoryId]
 */
export async function GET(_: Request, { params }: Params) {
  try {
    // 1) Unwrap params (Next.js 16)
    const { memoryId } = await params;

    // 2) Must be logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    // 3) Find current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 4) Fetch memory (must belong to user)
    const memory = await prisma.memoryCollection.findFirst({
      where: { id: memoryId, ownerId: user.id },
      include: {
        receiver: true,
        items: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!memory) {
      return Response.json({ error: "Memory not found." }, { status: 404 });
    }

    return Response.json({ memory });
  } catch (err) {
    console.error("GET /api/memory-sent/[memoryId] error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/memory-sent/[memoryId]
 * - BLOCK if any item is already RELEASED
 */
export async function DELETE(_: Request, { params }: Params) {
  try {
    const { memoryId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 1) Fetch memory with items status
    const memory = await prisma.memoryCollection.findFirst({
      where: { id: memoryId, ownerId: user.id },
      include: {
        items: {
          select: { status: true },
        },
      },
    });

    if (!memory) {
      return Response.json(
        { error: "Memory not found (or not owned by you)." },
        { status: 404 }
      );
    }

    // 2) Check if ANY item already released
    const hasReleasedItem = memory.items.some(
      (item: { status: MemoryItemStatus }) => item.status === "RELEASED"
    );

    if (hasReleasedItem) {
      return Response.json(
        {
          error:
            "This memory cannot be deleted because at least one message has already been released.",
        },
        { status: 400 }
      );
    }

    // 3) Safe to delete (items cascade due to relation onDelete: Cascade)
    await prisma.memoryCollection.delete({
      where: { id: memory.id },
    });

    return Response.json({ message: "Memory deleted successfully." });
  } catch (err) {
    console.error("DELETE /api/memory-sent/[memoryId] error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}