import { prisma } from "@/lib/prisma";
import { deleteFromB2ByKey } from "@/lib/b2Storage";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// File size limits in MB
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 200;

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
 * Validate that the attachment does not exceed the per-type size limit.
 * @param type       - IMAGE or VIDEO
 * @param mediaSizeMB - File size in MB (Float)
 */
function validateAttachmentSize(type: AttachmentType, mediaSizeMB: number) {
  if (type === "IMAGE" && mediaSizeMB > MAX_IMAGE_MB) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  if (type === "VIDEO" && mediaSizeMB > MAX_VIDEO_MB) {
    throw new Error("VIDEO_TOO_LARGE");
  }
}

async function cleanupB2Upload(mediaPublicId: string) {
  await deleteFromB2ByKey(mediaPublicId);
}

/**
 * POST /api/memory-sent/[memoryId]/items/[itemId]/attachments
 *
 * Purpose:
 * - Add a new attachment to an existing draft memory item
 * - Only the owner can add
 * - Cannot add if the item is already released
 * - Cannot add if any item in the same memory is already released
 * - Quota check against storageUsedMB / storageLimitMB
 *
 * All size values are in MB (Float).
 */
export async function POST(req: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    // Fetch user with MB-based storage fields for quota check
    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(session.user.email) },
      select: {
        id: true,
        storageUsedMB: true,
        storageLimitMB: true,
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

    // Accept mediaSizeMB directly; fall back to converting bytes if only bytes provided
    const rawMB = Number(body?.mediaSizeMB ?? 0);
    const rawBytes = Number(body?.mediaSizeBytes ?? body?.bytes ?? body?.originalFileSize ?? 0);
    const mediaSizeMB = rawMB > 0 ? rawMB : rawBytes / (1024 * 1024);

    if (!mediaUrl) {
      return Response.json({ error: "mediaUrl is required." }, { status: 400 });
    }

    if (!mediaPublicId) {
      return Response.json(
        { error: "mediaPublicId is required." },
        { status: 400 }
      );
    }

    if (mediaSizeMB <= 0) {
      return Response.json(
        { error: "mediaSizeMB is required and must be greater than 0." },
        { status: 400 }
      );
    }

    try {
      validateAttachmentSize(type, mediaSizeMB);
    } catch (e) {
      // Best-effort cleanup — file may already be in R2
      await cleanupB2Upload(mediaPublicId);

      if ((e as Error).message === "IMAGE_TOO_LARGE") {
        return Response.json(
          { error: "Image exceeds maximum allowed size of 10MB." },
          { status: 400 }
        );
      }

      if ((e as Error).message === "VIDEO_TOO_LARGE") {
        return Response.json(
          { error: "Video exceeds maximum allowed size of 200MB." },
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
      await cleanupB2Upload(mediaPublicId);
      return Response.json({ error: "Item not found." }, { status: 404 });
    }

    // 2) Prevent add if item itself already released
    if (item.status === "RELEASED") {
      await cleanupB2Upload(mediaPublicId);
      return Response.json(
        { error: "This item is already released and cannot accept new attachments." },
        { status: 400 }
      );
    }

    // 3) Prevent add if any item in same memory already released
    const releasedSibling = await prisma.memoryItem.findFirst({
      where: {
        collectionId: memoryId,
        ownerId: user.id,
        status: "RELEASED",
      },
      select: { id: true },
    });

    if (releasedSibling) {
      await cleanupB2Upload(mediaPublicId);
      return Response.json(
        {
          error: "This memory is locked because at least one message has already been released.",
        },
        { status: 400 }
      );
    }

    // 4) Quota check — all values in MB (Float)
    const usedMB = user.storageUsedMB;
    const limitMB = user.storageLimitMB;
    const projectedUsedMB = usedMB + mediaSizeMB;

    if (projectedUsedMB > limitMB) {
      await cleanupB2Upload(mediaPublicId);
      return Response.json(
        {
          error: "Storage quota exceeded. Please delete some files or upgrade your plan.",
          storage: {
            usedMB,
            limitMB,
            incomingMB: mediaSizeMB,
            projectedMB: projectedUsedMB,
            remainingMB: Math.max(0, limitMB - usedMB),
          },
        },
        { status: 400 }
      );
    }

    // 5) Create attachment record
    // Storage already incremented by /api/media/confirm-upload during presigned upload
    const result = await prisma.memoryAttachment.create({
      data: {
        itemId,
        type,
        mediaUrl,
        mediaPublicId,
        mediaFileName,
        mediaMimeType,
        mediaSizeMB,
      },
      select: {
        id: true,
        type: true,
        mediaUrl: true,
        mediaPublicId: true,
        mediaFileName: true,
        mediaMimeType: true,
        mediaSizeMB: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return Response.json(
      {
        message: "Attachment added successfully.",
        attachment: result,
        storage: {
          usedMB: projectedUsedMB,
          limitMB,
          remainingMB: Math.max(0, limitMB - projectedUsedMB),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/memory-sent/[memoryId]/items/[itemId]/attachments error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
