import { prisma } from "@/lib/prisma";
import { deleteFromB2ByKey } from "@/lib/b2Storage";
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


/**
 * DELETE /api/memory-sent/[memoryId]/attachments/[attachmentId]?itemId=...
 *
 * Rules:
 * - must be logged in
 * - must own the memory
 * - memory must not be locked
 * - attachment must belong to an item inside this memory
 * - delete from Cloudinary first, then DB
 * - decrease user's storageUsedBytes
 */
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { memoryId, attachmentId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(session.user.email) },
      select: {
        id: true,
        storageUsedBytes: true,
        storageLimitBytes: true,
      },
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
      where: {
        id: memoryId,
        ownerId: user.id,
      },
      select: {
        id: true,
        items: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!memory) {
      return Response.json({ error: "Memory not found." }, { status: 404 });
    }

    const hasReleasedItem = memory.items.some((item) => item.status === "RELEASED");
    if (hasReleasedItem) {
      return Response.json(
        {
          error:
            "This memory is locked because at least one message has already been released.",
        },
        { status: 400 }
      );
    }

    // 2) Ensure the item belongs to this memory
    const itemExistsInMemory = memory.items.some((item) => item.id === itemId);
    if (!itemExistsInMemory) {
      return Response.json(
        { error: "Item not found in this memory." },
        { status: 404 }
      );
    }

    // 3) Find attachment and ensure it belongs to that item
    const attachment = await prisma.memoryAttachment.findFirst({
      where: {
        id: attachmentId,
        itemId,
      },
      select: {
        id: true,
        type: true,
        mediaPublicId: true,
        mediaSizeBytes: true,
      },
    });

    if (!attachment) {
      return Response.json({ error: "Attachment not found." }, { status: 404 });
    }

    // 4) Delete from B2 (best-effort, non-fatal for old Cloudinary files)
    await deleteFromB2ByKey(attachment.mediaPublicId);

    // 5) Delete from DB and decrease quota in one transaction
    const result = await prisma.$transaction(async (tx) => {
      await tx.memoryAttachment.delete({
        where: { id: attachment.id },
      });

      const currentUsed = BigInt(user.storageUsedBytes);
      const attachmentBytes = BigInt(attachment.mediaSizeBytes);
      const nextUsed = currentUsed > attachmentBytes ? currentUsed - attachmentBytes : BigInt(0);

      await tx.user.update({
        where: { id: user.id },
        data: {
          storageUsedBytes: nextUsed,
        },
      });

      return {
        nextUsed,
        limitBytes: BigInt(user.storageLimitBytes),
      };
    });

    return Response.json({
      message: "Attachment deleted successfully.",
      attachmentId: attachment.id,
      storage: {
        usedBytes: result.nextUsed.toString(),
        limitBytes: result.limitBytes.toString(),
        remainingBytes: (result.limitBytes - result.nextUsed).toString(),
      },
    });
  } catch (err) {
    console.error("DELETE /api/memory-sent/[memoryId]/attachments/[attachmentId] error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}