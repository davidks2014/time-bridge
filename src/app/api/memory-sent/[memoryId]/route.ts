/**
 * API: /api/memory-sent/[memoryId]
 *
 * Purpose:
 * - GET    : Get 1 memory (collection/card) with receiver + items + attachments (owner only)
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

type Params = { params: Promise<{ memoryId: string }> };

function normalizeEmail(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

/**
 * GET /api/memory-sent/[memoryId]
 */
export async function GET(_: Request, { params }: Params) {
  try {
    const { memoryId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(session.user.email) },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const memory = await prisma.memoryCollection.findFirst({
      where: {
        id: memoryId,
        ownerId: user.id,
      },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,

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
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            title: true,
            content: true,
            releaseDate: true,
            releasedAt: true,
            status: true,
            createdAt: true,
            updatedAt: true,

            attachments: {
              orderBy: {
                createdAt: "asc",
              },
              select: {
                id: true,
                type: true,
                mediaUrl: true,
                mediaPublicId: true,
                mediaFileName: true,
                mediaMimeType: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!memory) {
      return Response.json({ error: "Memory not found." }, { status: 404 });
    }

    const formattedMemory = {
      ...memory,
      items: memory.items.map((item) => ({
        ...item,
        attachments: item.attachments ?? [],
        attachmentCount: item.attachments?.length ?? 0,
      })),
    };

    return Response.json({ memory: formattedMemory });
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
      where: { email: normalizeEmail(session.user.email) },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const memory = await prisma.memoryCollection.findFirst({
      where: {
        id: memoryId,
        ownerId: user.id,
      },
      select: {
        id: true,
        items: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!memory) {
      return Response.json(
        { error: "Memory not found (or not owned by you)." },
        { status: 404 }
      );
    }

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

    await prisma.memoryCollection.delete({
      where: { id: memory.id },
    });

    return Response.json({ message: "Memory deleted successfully." });
  } catch (err) {
    console.error("DELETE /api/memory-sent/[memoryId] error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}