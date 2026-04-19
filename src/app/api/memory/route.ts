/**
 * API: POST /api/memory
 */

import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { Prisma, AttachmentType } from "@prisma/client";
import { parseSingaporeDateTimeInput } from "@/lib/sg-time";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = BigInt(10 * 1024 * 1024); // 10MB
const MAX_VIDEO_BYTES = BigInt(100 * 1024 * 1024); // 100MB

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

function inferCloudinaryResourceType(type: "IMAGE" | "VIDEO"): "image" | "video" {
  return type === "VIDEO" ? "video" : "image";
}

function validateAttachmentSize(type: AttachmentType, mediaSizeBytes: bigint) {
  if (type === "IMAGE" && mediaSizeBytes > MAX_IMAGE_BYTES) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  if (type === "VIDEO" && mediaSizeBytes > MAX_VIDEO_BYTES) {
    throw new Error("VIDEO_TOO_LARGE");
  }
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

    validateAttachmentSize(type, mediaSizeBytes);

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

async function cleanupCloudinaryUploads(attachments: Array<{
  type: AttachmentType;
  mediaPublicId: string;
}>) {
  for (const attachment of attachments) {
    try {
      await cloudinary.uploader.destroy(attachment.mediaPublicId, {
        resource_type: inferCloudinaryResourceType(attachment.type),
      });
    } catch (cleanupError) {
      console.error("Cloudinary cleanup error:", cleanupError);
    }
  }
}

export async function POST(req: Request) {
  let parsedAttachmentsForCleanup: IncomingAttachment[] = [];

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
        identificationNo: true,
        phoneNumber: true,
        address: true,
        verificationStatus: true,
      },
    });

    if (!me) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // Block memory creation if profile is incomplete
    // User must have NRIC, phone, and address filled in
    if (!me.identificationNo || !me.phoneNumber || !me.address) {
      return Response.json(
        {
          error: "PROFILE_INCOMPLETE",
          message: "Please complete your profile before creating memories.",
        },
        { status: 403 }
      );
    }

    // Block memory creation if not yet approved by admin
    // Covers PENDING and REJECTED statuses
    if (me.verificationStatus !== "APPROVED") {
      return Response.json(
        {
          error: "NOT_VERIFIED",
          message: "Your account is pending admin verification. You can create memories once approved.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const collectionTitle = String(body.collectionTitle ?? "").trim();
    const itemTitle = String(body.itemTitle ?? "").trim();
    const itemContent = String(body.itemContent ?? "").trim();

    let attachments: IncomingAttachment[] = [];
    try {
      attachments = parseAttachments(body.attachments);
      parsedAttachmentsForCleanup = attachments;
    } catch (e) {
      const msg = (e as Error).message;

      // Best-effort cleanup if oversized assets were already uploaded directly to Cloudinary
      if (msg === "IMAGE_TOO_LARGE" || msg === "VIDEO_TOO_LARGE") {
        try {
          const rawAttachments = Array.isArray(body?.attachments) ? body.attachments : [];
          const cleanupTargets = rawAttachments
            .map((item: any) => {
              const typeValue = String(item?.type ?? "").trim().toUpperCase();
              const mediaPublicId = String(item?.mediaPublicId ?? "").trim();

              if (!mediaPublicId) return null;
              if (typeValue !== "IMAGE" && typeValue !== "VIDEO") return null;

              return {
                type: typeValue as AttachmentType,
                mediaPublicId,
              };
            })
            .filter(Boolean) as Array<{ type: AttachmentType; mediaPublicId: string }>;

          await cleanupCloudinaryUploads(cleanupTargets);
        } catch (cleanupErr) {
          console.error("Oversized upload cleanup failed:", cleanupErr);
        }
      }

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

      if (msg === "IMAGE_TOO_LARGE") {
        return Response.json(
          { error: "Image exceeds maximum allowed size of 10MB." },
          { status: 400 }
        );
      }

      if (msg === "VIDEO_TOO_LARGE") {
        return Response.json(
          { error: "Video exceeds maximum allowed size of 100MB." },
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
    const receiverType = String(newReceiver.receiverType ?? "ADULT").toUpperCase();
    const guardianName = String(newReceiver.guardianName ?? "").trim() || null;
    const guardianNric = String(newReceiver.guardianNric ?? "").trim() || null;
    const guardianEmail = String(newReceiver.guardianEmail ?? "").trim() || null;
    const guardianPhone = String(newReceiver.guardianPhone ?? "").trim() || null;
    const guardianAddress = String(newReceiver.guardianAddress ?? "").trim() || null;

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

    // Receiver NRIC is always mandatory — it is the golden key for identity
    if (!receiverIdNo) {
      return Response.json({ error: "Receiver identificationNo is required." }, { status: 400 });
    }

    // Receiver name is mandatory — needed for all delivery channels
    if (!receiverFullName) {
      return Response.json({ error: "Receiver fullName is required." }, { status: 400 });
    }

    // Receiver address is mandatory — needed for physical visit fallback
    if (!receiverAddress) {
      return Response.json({ error: "Receiver address is required." }, { status: 400 });
    }

    // Receiver email and phone are optional
    // A baby or young child may not have these yet
    // If missing, delivery will go through guardian or physical visit

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
          receiverType: (receiverType as any) ?? "ADULT",
          guardianName,
          guardianNric,
          guardianEmail,
          guardianPhone,
          guardianAddress,
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
      // Best-effort cleanup because direct uploads may already exist in Cloudinary
      if (attachments.length > 0) {
        await cleanupCloudinaryUploads(
          attachments.map((attachment) => ({
            type: attachment.type,
            mediaPublicId: attachment.mediaPublicId,
          }))
        );
      }

      return Response.json(
        {
          error: "Storage quota exceeded. Please delete some files or upgrade your plan.",
          storage: {
            usedBytes: currentUsedBytes.toString(),
            limitBytes: limitBytes.toString(),
            incomingFileBytes: totalAttachmentBytes.toString(),
            projectedUsedBytes: projectedUsedBytes.toString(),
            remainingBytes: (limitBytes > currentUsedBytes ? limitBytes - currentUsedBytes : BigInt(0)).toString(),
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
    // Best-effort cleanup for unexpected failures after direct Cloudinary upload
    if (parsedAttachmentsForCleanup.length > 0) {
      await cleanupCloudinaryUploads(
        parsedAttachmentsForCleanup.map((attachment) => ({
          type: attachment.type,
          mediaPublicId: attachment.mediaPublicId,
        }))
      );
    }

    console.error("POST /api/memory error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}