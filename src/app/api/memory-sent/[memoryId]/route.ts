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
import { deleteFromB2ByKey } from "@/lib/b2Storage";
import { decrementStorage } from "@/lib/storageTracking";
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
                mediaSizeBytes: true,
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
        attachments: (item.attachments ?? []).map((att) => ({
          ...att,
          mediaSizeBytes: att.mediaSizeBytes.toString(),
        })),
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
 *
 * Purpose: Delete an entire memory and all its attachments.
 * 1. Block if any item is already RELEASED
 * 2. Fetch all attachments with R2 keys and sizes
 * 3. Delete each file from R2 (best-effort, non-fatal)
 * 4. Delete memory from DB (cascade deletes items + attachments)
 * 5. Decrement user storage by total MB of deleted files
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
      where: { id: memoryId, ownerId: user.id },
      select: {
        id: true,
        items: {
          select: {
            id: true,
            status: true,
            attachments: {
              select: {
                mediaPublicId: true, // B2 object key for deletion
                mediaSizeMB: true,   // size for storage decrement
              },
            },
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
        { error: "This memory cannot be deleted because at least one message has already been released." },
        { status: 400 }
      );
    }

    const allAttachments = memory.items.flatMap((item) => item.attachments ?? []);

    // Delete all attachment files from B2 (log errors but don't block deletion)
    let totalSizeMB = 0;
    for (const att of allAttachments) {
      try {
        await deleteFromB2ByKey(att.mediaPublicId);
        totalSizeMB += att.mediaSizeMB;
      } catch (b2Err) {
        console.error("B2 delete error for key:", att.mediaPublicId, b2Err);
      }
    }

    // Delete memory from DB (cascade deletes items + attachments)
    await prisma.memoryCollection.delete({ where: { id: memory.id } });

    // Decrement user storage by total size of deleted files
    if (totalSizeMB > 0) {
      await decrementStorage(user.id, totalSizeMB);
    }

    return Response.json({
      message: "Memory deleted successfully.",
      deletedAttachmentCount: allAttachments.length,
    });
  } catch (err) {
    console.error("DELETE /api/memory-sent/[memoryId] error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}