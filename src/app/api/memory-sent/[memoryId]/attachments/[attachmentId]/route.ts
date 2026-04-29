/**
 * API: DELETE /api/memory-sent/[memoryId]/attachments/[attachmentId]
 *
 * Purpose: Delete a single attachment from a memory item.
 * Deletes the file from Cloudflare R2, then removes the DB record,
 * then decrements the owner's storage usage (storageUsedMB).
 *
 * Query params:
 *   - itemId: string (required) — the memory item this attachment belongs to
 *
 * Rules:
 *   - Must be logged in
 *   - Must own the memory
 *   - Memory must not be locked (no released items)
 */

import { prisma } from "@/lib/prisma";
import { deleteFromB2ByKey } from "@/lib/b2Storage";
import { decrementStorage } from "@/lib/storageTracking";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    memoryId: string;
    attachmentId: string;
  }>;
};

function normalizeEmail(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { memoryId, attachmentId } = await params;

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

    const { searchParams } = new URL(req.url);
    const itemId = String(searchParams.get("itemId") ?? "").trim();

    if (!itemId) {
      return Response.json({ error: "itemId is required." }, { status: 400 });
    }

    // 1) Check memory ownership and lock rule
    const memory = await prisma.memoryCollection.findFirst({
      where: { id: memoryId, ownerId: user.id },
      select: {
        id: true,
        items: { select: { id: true, status: true } },
      },
    });

    if (!memory) {
      return Response.json({ error: "Memory not found." }, { status: 404 });
    }

    const hasReleasedItem = memory.items.some((item) => item.status === "RELEASED");
    if (hasReleasedItem) {
      return Response.json(
        { error: "This memory is locked because at least one message has already been released." },
        { status: 400 }
      );
    }

    // 2) Ensure the item belongs to this memory
    const itemExistsInMemory = memory.items.some((item) => item.id === itemId);
    if (!itemExistsInMemory) {
      return Response.json({ error: "Item not found in this memory." }, { status: 404 });
    }

    // 3) Find attachment — select mediaSizeMB for storage decrement
    const attachment = await prisma.memoryAttachment.findFirst({
      where: { id: attachmentId, itemId },
      select: {
        id: true,
        type: true,
        mediaPublicId: true, // R2 object key
        mediaSizeMB: true,   // needed for storage decrement
      },
    });

    if (!attachment) {
      return Response.json({ error: "Attachment not found." }, { status: 404 });
    }

    // 4) Delete file from Cloudflare R2 using the stored object key
    await deleteFromB2ByKey(attachment.mediaPublicId);

    // 5) Delete attachment record from DB
    await prisma.memoryAttachment.delete({ where: { id: attachment.id } });

    // 6) Decrement user storage by the size of the deleted file
    await decrementStorage(user.id, attachment.mediaSizeMB);

    return Response.json({
      message: "Attachment deleted successfully.",
      attachmentId: attachment.id,
    });
  } catch (err) {
    console.error("DELETE /api/memory-sent/[memoryId]/attachments/[attachmentId] error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
