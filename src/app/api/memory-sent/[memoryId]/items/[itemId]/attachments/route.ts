import { prisma } from "@/lib/prisma";
import { deleteFromB2ByKey } from "@/lib/b2Storage";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = BigInt(10 * 1024 * 1024); // 10MB
const MAX_VIDEO_BYTES = BigInt(200 * 1024 * 1024); // 200MB

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

function validateAttachmentSize(type: AttachmentType, mediaSizeBytes: bigint) {
  if (type === "IMAGE" && mediaSizeBytes > MAX_IMAGE_BYTES) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  if (type === "VIDEO" && mediaSizeBytes > MAX_VIDEO_BYTES) {
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
 * - Add a new attachment to an existing draft item
 * - Only owner can add
 * - Cannot add if item is released
 * - Cannot add if any item in same memory is already released
 * - Increase user's storageUsedBytes
 * - Backend-enforce max attachment size
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
    const mediaSizeMB = Number(body?.mediaSizeMB ?? 0);

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

    try {
      validateAttachmentSize(type, mediaSizeBytes);
    } catch (e) {
      // Best-effort cleanup in case file was already uploaded directly to R2
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
      // Cleanup uploaded file because item is invalid
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
          error:
            "This memory is locked because at least one message has already been released.",
        },
        { status: 400 }
      );
    }

    // 4) Quota check again here
    const usedBytes = BigInt(user.storageUsedBytes);
    const limitBytes = BigInt(user.storageLimitBytes);
    const projectedUsedBytes = usedBytes + mediaSizeBytes;

    if (projectedUsedBytes > limitBytes) {
      await cleanupB2Upload(mediaPublicId);

      return Response.json(
        {
          error: "Storage quota exceeded. Please delete some files or upgrade your plan.",
          storage: {
            usedBytes: usedBytes.toString(),
            limitBytes: limitBytes.toString(),
            incomingFileBytes: mediaSizeBytes.toString(),
            projectedUsedBytes: projectedUsedBytes.toString(),
            remainingBytes: (limitBytes > usedBytes ? limitBytes - usedBytes : BigInt(0)).toString(),
          },
        },
        { status: 400 }
      );
    }

    // 5) Create attachment and update quota in one transaction
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
          mediaSizeMB, // save for future deletion tracking
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