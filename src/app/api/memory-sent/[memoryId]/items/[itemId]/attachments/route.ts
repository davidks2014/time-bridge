import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    memoryId: string;
    itemId: string;
  }>;
};

type AttachmentType = "IMAGE" | "VIDEO";

function normalizeEmail(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

function normalizeAttachmentType(raw: unknown): AttachmentType {
  const value = String(raw ?? "").trim().toUpperCase();

  if (value === "IMAGE" || value === "VIDEO") {
    return value as AttachmentType;
  }

  throw new Error("INVALID_ATTACHMENT_TYPE");
}

/**
 * POST /api/memory-sent/[memoryId]/items/[itemId]/attachments
 *
 * Purpose:
 * - Add a new attachment to an existing draft item
 * - Only owner can add
 * - Cannot add if item is released
 * - Cannot add if any item in same memory is already released
 * - Increases user's storageUsedBytes
 */
export async function POST(req: Request, { params }: Params) {
  try {
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

    const { memoryId, itemId } = await params;
    const body = await req.json().catch(() => ({}));

    let type: AttachmentType;
    try {
      type = normalizeAttachmentType(body?.type);
    } catch {
      return Response.json(
        { error: "type must be IMAGE or VIDEO." },
        { status: 400 }
      );
    }

    const mediaUrl = String(body?.mediaUrl ?? "").trim();
    const mediaPublicId = String(body?.mediaPublicId ?? "").trim();
    const mediaFileName = body?.mediaFileName
      ? String(body.mediaFileName).trim()
      : null;
    const mediaMimeType = body?.mediaMimeType
      ? String(body.mediaMimeType).trim()
      : null;

    const rawSize = body?.mediaSizeBytes ?? body?.bytes ?? body?.originalFileSize ?? 0;
    const mediaSizeBytes = BigInt(Number(rawSize) || 0);

    if (!mediaUrl) {
      return Response.json({ error: "mediaUrl is required." }, { status: 400 });
    }

    if (!mediaPublicId) {
      return Response.json(
        { error: "mediaPublicId is required." },
        { status: 400 }
      );
    }

    if (mediaSizeBytes <= BigInt(0)) {
      return Response.json(
        { error: "mediaSizeBytes is required and must be greater than 0." },
        { status: 400 }
      );
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

    // 2) Prevent add if item itself already released
    if (item.status === "RELEASED") {
      return Response.json(
        { error: "This item is already released and cannot accept new attachments." },
        { status: 400 }
      );
    }

    // 3) Prevent add if any item in same memory already released (collection lock rule)
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

    // 4) Quota check again here (important)
    const usedBytes = BigInt(user.storageUsedBytes);
    const limitBytes = BigInt(user.storageLimitBytes);
    const projectedUsedBytes = usedBytes + mediaSizeBytes;

    if (projectedUsedBytes > limitBytes) {
      return Response.json(
        {
          error: "Storage quota exceeded. Please delete some files or upgrade your plan.",
          storage: {
            usedBytes: usedBytes.toString(),
            limitBytes: limitBytes.toString(),
            incomingFileBytes: mediaSizeBytes.toString(),
            projectedUsedBytes: projectedUsedBytes.toString(),
          },
        },
        { status: 400 }
      );
    }

    // 5) Create attachment and update user quota in one transaction
    const result = await prisma.$transaction(async (tx) => {
      const attachment = await tx.memoryAttachment.create({
        data: {
          itemId,
          type,
          mediaUrl,
          mediaPublicId,
          mediaFileName,
          mediaMimeType,
          mediaSizeBytes,
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
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          storageUsedBytes: {
            increment: mediaSizeBytes,
          },
        },
      });

      return attachment;
    });

    return Response.json(
      {
        message: "Attachment added successfully.",
        attachment: {
          ...result,
          mediaSizeBytes: result.mediaSizeBytes.toString(),
        },
        storage: {
          usedBytes: projectedUsedBytes.toString(),
          limitBytes: limitBytes.toString(),
          remainingBytes: (limitBytes - projectedUsedBytes).toString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/memory-sent/[memoryId]/items/[itemId]/attachments error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}