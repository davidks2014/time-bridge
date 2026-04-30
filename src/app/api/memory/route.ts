/**
 * API: POST /api/memory
 */

import { prisma } from "@/lib/prisma";
import { deleteFromB2ByKey } from "@/lib/b2Storage";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { AttachmentType } from "@prisma/client";
import { parseSingaporeDateTimeInput } from "@/lib/sg-time";

export const dynamic = "force-dynamic";

// File size limits in MB
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 200;

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

type IncomingAttachment = {
  type: AttachmentType;
  mediaUrl: string;
  mediaPublicId: string;
  mediaFileName: string | null;
  mediaMimeType: string | null;
  mediaSizeMB: number; // size in MB (Float)
};

/**
 * Parse and validate the attachments array from the request body.
 * Accepts mediaSizeMB directly; falls back to converting bytes if only bytes are provided.
 */
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

    // Use mediaSizeMB directly if provided; otherwise convert from bytes
    const rawMB = Number((item as any)?.mediaSizeMB ?? 0);
    const rawBytes = Number((item as any)?.mediaSizeBytes ?? (item as any)?.bytes ?? 0);
    const mediaSizeMB = rawMB > 0 ? rawMB : rawBytes / (1024 * 1024);

    if (!mediaUrl) {
      throw new Error("ATTACHMENT_MEDIA_URL_REQUIRED");
    }

    if (!mediaPublicId) {
      throw new Error("ATTACHMENT_MEDIA_PUBLIC_ID_REQUIRED");
    }

    if (mediaSizeMB <= 0) {
      throw new Error("ATTACHMENT_MEDIA_SIZE_REQUIRED");
    }

    validateAttachmentSize(type, mediaSizeMB);

    return {
      type,
      mediaUrl,
      mediaPublicId,
      mediaFileName,
      mediaMimeType,
      mediaSizeMB,
    };
  });
}

async function cleanupB2Uploads(attachments: Array<{
  mediaPublicId: string;
}>) {
  for (const attachment of attachments) {
    await deleteFromB2ByKey(attachment.mediaPublicId);
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
        storageUsedMB: true,
        storageLimitMB: true,
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

      // Best-effort cleanup if oversized assets were already uploaded directly to R2
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

          await cleanupB2Uploads(cleanupTargets);
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
          { error: "Each attachment requires a file size greater than 0." },
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
          { error: "Video exceeds maximum allowed size of 200MB." },
          { status: 400 }
        );
      }

      throw e;
    }

    // Support receivers array (new) or newReceiver (legacy)
    const receiversInput = Array.isArray(body.receivers)
      ? body.receivers
      : body.newReceiver
      ? [body.newReceiver]
      : [];

    if (receiversInput.length === 0) {
      return Response.json({ error: "At least one receiver is required." }, { status: 400 });
    }

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

    // Validate each receiver
    for (const r of receiversInput) {
      const rIdNo = normalizeIdentificationNo(r.identificationNo ?? "");
      const rName = String(r.fullName ?? "").trim();
      const rAddress = String(r.address ?? "").trim();
      if (!rIdNo) return Response.json({ error: "Receiver identificationNo is required." }, { status: 400 });
      if (!rName) return Response.json({ error: "Receiver fullName is required." }, { status: 400 });
      if (!rAddress) return Response.json({ error: "Receiver address is required." }, { status: 400 });
    }

    let releaseDate: Date | null = null;
    try {
      releaseDate = parseOptionalReleaseDate(body.releaseDate);
    } catch (e) {
      if ((e as Error).message === "INVALID_RELEASE_DATE") {
        return Response.json(
          {
            error: "Invalid releaseDate. Please choose a valid Singapore date and time.",
          },
          { status: 400 }
        );
      }
      throw e;
    }

    // Quota check — all values in MB (Float)
    const totalAttachmentMB = attachments.reduce((sum, a) => sum + a.mediaSizeMB, 0);
    const currentUsedMB = me.storageUsedMB;
    const limitMB = me.storageLimitMB;
    const projectedUsedMB = currentUsedMB + totalAttachmentMB;

    if (projectedUsedMB > limitMB) {
      if (attachments.length > 0) {
        await cleanupB2Uploads(
          attachments.map((a) => ({ mediaPublicId: a.mediaPublicId }))
        );
      }

      return Response.json(
        {
          error: "Storage quota exceeded. Please delete some files or upgrade your plan.",
          storage: {
            usedMB: currentUsedMB,
            limitMB,
            incomingMB: totalAttachmentMB,
            projectedMB: projectedUsedMB,
            remainingMB: Math.max(0, limitMB - currentUsedMB),
          },
        },
        { status: 400 }
      );
    }

    // Create one memory collection per receiver
    const createdCollections = [];

    for (const receiverInput of receiversInput) {
      const rIdNo = normalizeIdentificationNo(receiverInput.identificationNo ?? "");
      const rName = String(receiverInput.fullName ?? "").trim();
      const rEmail = normalizeEmail(receiverInput.email ?? "");
      const rPhone = String(receiverInput.phone ?? "").trim();
      const rAddress = String(receiverInput.address ?? "").trim();
      const rType = String(receiverInput.receiverType ?? "ADULT").toUpperCase();
      const gName = String(receiverInput.guardianName ?? "").trim() || null;
      const gNric = String(receiverInput.guardianNric ?? "").trim() || null;
      const gEmail = String(receiverInput.guardianEmail ?? "").trim() || null;
      const gPhone = String(receiverInput.guardianPhone ?? "").trim() || null;
      const gAddress = String(receiverInput.guardianAddress ?? "").trim() || null;

      // Find or create receiver
      let receiver = await prisma.receiver.findFirst({
        where: { ownerId: me.id, identificationNo: rIdNo },
      });

      if (receiver) {
        receiver = await prisma.receiver.update({
          where: { id: receiver.id },
          data: {
            fullName: rName, email: rEmail, phone: rPhone, address: rAddress,
            receiverType: rType,
            guardianName: gName, guardianNric: gNric, guardianEmail: gEmail,
            guardianPhone: gPhone, guardianAddress: gAddress,
          } as any,
        });
      } else {
        receiver = await prisma.receiver.create({
          data: {
            ownerId: me.id, fullName: rName, email: rEmail, phone: rPhone,
            address: rAddress, identificationNo: rIdNo, receiverType: rType,
            guardianName: gName, guardianNric: gNric, guardianEmail: gEmail,
            guardianPhone: gPhone, guardianAddress: gAddress,
          } as any,
        });
      }

      // Create collection with items and attachments
      const collection = await prisma.memoryCollection.create({
        data: {
          ownerId: me.id,
          receiverId: receiver.id,
          title: collectionTitle,
          items: {
            create: {
              ownerId: me.id,
              title: itemTitle,
              content: itemContent,
              releaseDate: releaseDate ? new Date(releaseDate) : null,
              attachments: {
                create: attachments.map((att) => ({
                  type: att.type,
                  mediaUrl: att.mediaUrl,
                  mediaPublicId: att.mediaPublicId,
                  mediaFileName: att.mediaFileName ?? null,
                  mediaMimeType: att.mediaMimeType ?? null,
                  mediaSizeMB: att.mediaSizeMB,
                })),
              },
            },
          },
        },
        select: { id: true },
      });

      createdCollections.push(collection);
    }

    // Increment storage usage once for the shared attachments (MB)
    if (attachments.length > 0) {
      await prisma.user.update({
        where: { id: me.id },
        data: { storageUsedMB: { increment: totalAttachmentMB } },
      });
    }

    return Response.json(
      {
        message: `Memory created for ${createdCollections.length} receiver(s).`,
        memoryId: createdCollections[0]?.id,
        collections: createdCollections.map((c) => ({ id: c.id })),
      },
      { status: 201 }
    );
  } catch (err) {
    // Best-effort cleanup for unexpected failures after direct R2 upload
    if (parsedAttachmentsForCleanup.length > 0) {
      await cleanupB2Uploads(
        parsedAttachmentsForCleanup.map((a) => ({ mediaPublicId: a.mediaPublicId }))
      );
    }

    console.error("POST /api/memory error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
