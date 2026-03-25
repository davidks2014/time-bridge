import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { parseSingaporeDateTimeInput } from "@/lib/sg-time";

export const dynamic = "force-dynamic";

function normalizeEmail(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

function parseOptionalReleaseDate(raw: unknown): Date | null {
  try {
    return parseSingaporeDateTimeInput(raw);
  } catch {
    throw new Error("INVALID_RELEASE_DATE");
  }
}

/**
 * PATCH /api/memory-sent/[memoryId]/items/[itemId]
 *
 * Purpose:
 * - Edit one memory item under a memory collection
 * - Only owner can edit
 * - Cannot edit if item already released
 * - Cannot edit if any item in the same collection is already released
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ memoryId: string; itemId: string }> }
) {
  try {
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

    const { memoryId, itemId } = await params;
    const body = await req.json().catch(() => ({}));

    const title = String(body?.title ?? "").trim();
    const content = body?.content == null ? null : String(body.content).trim();

    if (!title) {
      return Response.json({ error: "title is required." }, { status: 400 });
    }

    let releaseDate: Date | null = null;
    try {
      releaseDate = parseOptionalReleaseDate(body?.releaseDate);
    } catch (e) {
      if ((e as Error).message === "INVALID_RELEASE_DATE") {
        return Response.json(
          {
            error:
              "Invalid releaseDate. Please choose a valid Singapore date and time.",
          },
          { status: 400 }
        );
      }
      throw e;
    }

    // 1) Ensure item belongs to this memory + owner
    const item = await prisma.memoryItem.findFirst({
      where: {
        id: itemId,
        collectionId: memoryId,
        ownerId: user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!item) {
      return Response.json({ error: "Item not found." }, { status: 404 });
    }

    // 2) Prevent edit if item itself already released
    if (item.status === "RELEASED") {
      return Response.json(
        { error: "This item is already released and cannot be edited." },
        { status: 400 }
      );
    }

    // 3) Prevent edit if any item in same memory already released (collection lock rule)
    const releasedSibling = await prisma.memoryItem.findFirst({
      where: {
        collectionId: memoryId,
        ownerId: user.id,
        status: "RELEASED",
      },
      select: { id: true },
    });

    if (releasedSibling) {
      return Response.json(
        {
          error:
            "This memory is locked because at least one message has already been released.",
        },
        { status: 400 }
      );
    }

    // 4) Content is required for text message-based model
    if (content == null || !content) {
      return Response.json(
        { error: "content is required." },
        { status: 400 }
      );
    }

    // 5) Update item
    const updated = await prisma.memoryItem.update({
      where: { id: itemId },
      data: {
        title,
        content,
        releaseDate,
      },
      select: {
        id: true,
        title: true,
        content: true,
        releaseDate: true,
        releasedAt: true,
        status: true,
        updatedAt: true,
      },
    });

    return Response.json({
      message: "Item updated successfully.",
      item: updated,
    });
  } catch (err) {
    console.error("PATCH /api/memory-sent/[memoryId]/items/[itemId] error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/memory-sent/[memoryId]/items/[itemId]
 *
 * Purpose:
 * - Delete one memory item
 * - Only owner can delete
 * - Cannot delete if item already released
 * - Cannot delete if any item in the same collection is already released
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ memoryId: string; itemId: string }> }
) {
  try {
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

    const { memoryId, itemId } = await params;

    // 1) Ensure item belongs to this memory + owner
    const item = await prisma.memoryItem.findFirst({
      where: {
        id: itemId,
        collectionId: memoryId,
        ownerId: user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!item) {
      return Response.json({ error: "Item not found." }, { status: 404 });
    }

    // 2) Prevent delete if item already released
    if (item.status === "RELEASED") {
      return Response.json(
        { error: "This item is already released and cannot be deleted." },
        { status: 400 }
      );
    }

    // 3) Prevent delete if any item in same memory already released (collection lock rule)
    const releasedSibling = await prisma.memoryItem.findFirst({
      where: {
        collectionId: memoryId,
        ownerId: user.id,
        status: "RELEASED",
      },
      select: { id: true },
    });

    if (releasedSibling) {
      return Response.json(
        {
          error:
            "This memory is locked because at least one message has already been released.",
        },
        { status: 400 }
      );
    }

    // 4) Delete item (attachments cascade because of relation onDelete: Cascade)
    await prisma.memoryItem.delete({
      where: { id: itemId },
    });

    return Response.json({
      message: "Item deleted successfully.",
    });
  } catch (err) {
    console.error("DELETE /api/memory-sent/[memoryId]/items/[itemId] error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}