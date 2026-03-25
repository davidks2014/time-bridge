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
 */
export async function POST(req: Request, { params }: Params) {
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

    if (!mediaUrl) {
      return Response.json({ error: "mediaUrl is required." }, { status: 400 });
    }

    if (!mediaPublicId) {
      return Response.json(
        { error: "mediaPublicId is required." },
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

    // 4) Create attachment
    const attachment = await prisma.memoryAttachment.create({
      data: {
        itemId,
        type,
        mediaUrl,
        mediaPublicId,
        mediaFileName,
        mediaMimeType,
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
    });

    return Response.json(
      {
        message: "Attachment added successfully.",
        attachment,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/memory-sent/[memoryId]/items/[itemId]/attachments error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}