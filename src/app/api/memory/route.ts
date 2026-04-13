/**
 * API: POST /api/memory
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { Prisma, AttachmentType } from "@prisma/client";
import { parseSingaporeDateTimeInput } from "@/lib/sg-time";

export const dynamic = "force-dynamic";

function normalizeIdentificationNo(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "");
}

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

function normalizeAttachmentType(raw: unknown): AttachmentType {
  const value = String(raw ?? "").trim().toUpperCase();

  if (value === "IMAGE") return "IMAGE";
  if (value === "VIDEO") return "VIDEO";

  throw new Error("INVALID_ATTACHMENT_TYPE");
}

type IncomingAttachment = {
  type: AttachmentType;
  mediaUrl: string;
  mediaPublicId: string;
  mediaFileName: string | null;
  mediaMimeType: string | null;
  mediaSizeBytes: bigint;
};

function parseAttachments(raw: unknown): IncomingAttachment[] {
  if (raw == null) return [];

  if (!Array.isArray(raw)) {
    throw new Error("INVALID_ATTACHMENTS");
  }

  return raw.map((item) => {
    const type = normalizeAttachmentType((item as any)?.type);
    const mediaUrl = String((item as any)?.mediaUrl ?? "").trim();
    const mediaPublicId = String((item as any)?.mediaPublicId ?? "").trim();
    const mediaFileName = String((item as any)?.mediaFileName ?? "").trim() || null;
    const mediaMimeType = String((item as any)?.mediaMimeType ?? "").trim() || null;

    const rawSize =
      (item as any)?.mediaSizeBytes ??
      (item as any)?.bytes ??
      (item as any)?.originalFileSize ??
      0;

    const mediaSizeBytes = BigInt(Number(rawSize) || 0);

    if (!mediaUrl) {
      throw new Error("ATTACHMENT_MEDIA_URL_REQUIRED");
    }

    if (!mediaPublicId) {
      throw new Error("ATTACHMENT_MEDIA_PUBLIC_ID_REQUIRED");
    }

    if (mediaSizeBytes <= BigInt(0)) {
      throw new Error("ATTACHMENT_MEDIA_SIZE_REQUIRED");
    }

    return {
      type,
      mediaUrl,
      mediaPublicId,
      mediaFileName,
      mediaMimeType,
      mediaSizeBytes,
    };
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { email: normalizeEmail(session.user.email) },
      select: {
        id: true,
        email: true,
        storageUsedBytes: true,
        storageLimitBytes: true,
      },
    });

    if (!me) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const body = await req.json();

    const collectionTitle = String(body.collectionTitle ?? "").trim();
    const itemTitle = String(body.itemTitle ?? "").trim();
    const itemContent = String(body.itemContent ?? "").trim();

    let attachments: IncomingAttachment[] = [];
    try {
      attachments = parseAttachments(body.attachments);
    } catch (e) {
      const msg = (e as Error).message;

      if (msg === "INVALID_ATTACHMENTS") {
        return Response.json(
          { error: "attachments must be an array." },
          { status: 400 }
        );
      }

      if (msg === "INVALID_ATTACHMENT_TYPE") {
        return Response.json(
          { error: "Attachment type must be IMAGE or VIDEO." },
          { status: 400 }
        );
      }

      if (msg === "ATTACHMENT_MEDIA_URL_REQUIRED") {
        return Response.json(
          { error: "Each attachment requires mediaUrl." },
          { status: 400 }
        );
      }

      if (msg === "ATTACHMENT_MEDIA_PUBLIC_ID_REQUIRED") {
        return Response.json(
          { error: "Each attachment requires mediaPublicId." },
          { status: 400 }
        );
      }

      if (msg === "ATTACHMENT_MEDIA_SIZE_REQUIRED") {
        return Response.json(
          { error: "Each attachment requires mediaSizeBytes greater than 0." },
          { status: 400 }
        );
      }

      throw e;
    }

    const newReceiver = body.newReceiver ?? {};
    const receiverFullName = String(newReceiver.fullName ?? "").trim();
    const receiverEmail = normalizeEmail(newReceiver.email ?? "");
    const receiverPhone = String(newReceiver.phone ?? "").trim();
    const receiverAddress = String(newReceiver.address ?? "").trim();
    const receiverIdNo = normalizeIdentificationNo(newReceiver.identificationNo ?? "");

    if (!collectionTitle) {
      return Response.json({ error: "collectionTitle is required." }, { status: 400 });
    }

    if (!itemTitle) {
      return Response.json({ error: "itemTitle is required." }, { status: 400 });
    }

    if (!itemContent) {
      return Response.json(
        { error: "itemContent is required. Message text cannot be empty." },
        { status: 400 }
      );
    }

    if (!receiverFullName) {
      return Response.json({ error: "Receiver fullName is required." }, { status: 400 });
    }

    if (!receiverEmail) {
      return Response.json({ error: "Receiver email is required." }, { status: 400 });
    }

    if (!receiverPhone) {
      return Response.json({ error: "Receiver phone is required." }, { status: 400 });
    }

    if (!receiverAddress) {
      return Response.json({ error: "Receiver address is required." }, { status: 400 });
    }

    if (!receiverIdNo) {
      return Response.json({ error: "Receiver identificationNo is required." }, { status: 400 });
    }

    let releaseDate: Date | null = null;
    try {
      releaseDate = parseOptionalReleaseDate(body.releaseDate);
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

    const existingReceiver = await prisma.receiver.findFirst({
      where: {
        ownerId: me.id,
        identificationNo: receiverIdNo,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        address: true,
        identificationNo: true,
        linkedUserId: true,
      },
    });

    if (existingReceiver && normalizeEmail(existingReceiver.email) !== receiverEmail) {
      return Response.json(
        {
          error: "RECEIVER_EMAIL_MISMATCH",
          message:
            "Identification number matched an existing receiver, but email does not match. Please use the existing email or cancel and re-check.",
          receiver: {
            id: existingReceiver.id,
            fullName: existingReceiver.fullName,
            email: existingReceiver.email,
            phone: existingReceiver.phone,
            address: existingReceiver.address,
            identificationNo: existingReceiver.identificationNo,
            linkedUserId: existingReceiver.linkedUserId,
          },
        },
        { status: 409 }
      );
    }

    let receiverId: string;

    if (existingReceiver) {
      receiverId = existingReceiver.id;
    } else {
      const created = await prisma.receiver.create({
        data: {
          ownerId: me.id,
          fullName: receiverFullName,
          email: receiverEmail,
          phone: receiverPhone,
          address: receiverAddress,
          identificationNo: receiverIdNo,
        },
        select: { id: true },
      });

      receiverId = created.id;
    }

    const totalAttachmentBytes = attachments.reduce(
      (sum, attachment) => sum + attachment.mediaSizeBytes,
      BigInt(0)
    );

    const currentUsedBytes = BigInt(me.storageUsedBytes);
    const limitBytes = BigInt(me.storageLimitBytes);
    const projectedUsedBytes = currentUsedBytes + totalAttachmentBytes;

    if (projectedUsedBytes > limitBytes) {
      return Response.json(
        {
          error: "Storage quota exceeded. Please delete some files or upgrade your plan.",
          storage: {
            usedBytes: currentUsedBytes.toString(),
            limitBytes: limitBytes.toString(),
            incomingFileBytes: totalAttachmentBytes.toString(),
            projectedUsedBytes: projectedUsedBytes.toString(),
          },
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const memory = await tx.memoryCollection.create({
        data: {
          ownerId: me.id,
          receiverId,
          title: collectionTitle,
        },
        select: { id: true },
      });

      const item = await tx.memoryItem.create({
        data: {
          ownerId: me.id,
          collectionId: memory.id,
          title: itemTitle,
          content: itemContent,
          releaseDate,
        },
        select: { id: true, status: true },
      });

      if (attachments.length > 0) {
        await tx.memoryAttachment.createMany({
          data: attachments.map((attachment) => ({
            itemId: item.id,
            type: attachment.type,
            mediaUrl: attachment.mediaUrl,
            mediaPublicId: attachment.mediaPublicId,
            mediaFileName: attachment.mediaFileName,
            mediaMimeType: attachment.mediaMimeType,
            mediaSizeBytes: attachment.mediaSizeBytes,
          })),
        });

        await tx.user.update({
          where: { id: me.id },
          data: {
            storageUsedBytes: {
              increment: totalAttachmentBytes,
            },
          },
        });
      }

      return {
        memoryId: memory.id,
        itemId: item.id,
        itemStatus: item.status,
        attachmentCount: attachments.length,
        storageUsedBytes: projectedUsedBytes.toString(),
      };
    });

    return Response.json(
      {
        message: "Memory created.",
        memoryId: result.memoryId,
        itemId: result.itemId,
        itemStatus: result.itemStatus,
        attachmentCount: result.attachmentCount,
        storage: {
          usedBytes: projectedUsedBytes.toString(),
          limitBytes: limitBytes.toString(),
          remainingBytes: (limitBytes - projectedUsedBytes).toString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/memory error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}