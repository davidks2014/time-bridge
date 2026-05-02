/**
 * API: POST /api/memory/release-now
 *
 * Purpose:
 * - Creates a memory AND immediately releases it to the receiver
 * - Sends the invite email to the receiver right away
 * - No waiting for cron job
 *
 * Flow:
 * 1. Validate session and user
 * 2. Create memory collection + item (same as /api/memory)
 * 3. Immediately set status to RELEASED
 * 4. Create invite token
 * 5. Send invite email to receiver
 * 6. Return success
 *
 * Auth: Must be logged in and APPROVED
 */
import { prisma } from "@/lib/prisma";
import { deleteFromB2ByKey } from "@/lib/b2Storage";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createOrReuseReceiverInvite, sendInviteDelivery } from "@/lib/invites";
import type { AttachmentType } from "@prisma/client";

export const dynamic = "force-dynamic";

const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 200;

function normalizeIdentificationNo(raw: string): string {
  return String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/-/g, "");
}

function normalizeEmail(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

function normalizeAttachmentType(raw: unknown): AttachmentType {
  const value = String(raw ?? "").trim().toUpperCase();
  if (value === "IMAGE") return "IMAGE";
  if (value === "VIDEO") return "VIDEO";
  throw new Error("INVALID_ATTACHMENT_TYPE");
}

function validateAttachmentSize(type: AttachmentType, mediaSizeMB: number) {
  if (type === "IMAGE" && mediaSizeMB > MAX_IMAGE_MB) throw new Error("IMAGE_TOO_LARGE");
  if (type === "VIDEO" && mediaSizeMB > MAX_VIDEO_MB) throw new Error("VIDEO_TOO_LARGE");
}

type IncomingAttachment = {
  type: AttachmentType;
  mediaUrl: string;
  mediaPublicId: string;
  mediaFileName: string | null;
  mediaMimeType: string | null;
  mediaSizeMB: number;
};

function parseAttachments(raw: unknown): IncomingAttachment[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new Error("INVALID_ATTACHMENTS");
  return raw.map((item) => {
    const type = normalizeAttachmentType((item as any)?.type);
    const mediaUrl = String((item as any)?.mediaUrl ?? "").trim();
    const mediaPublicId = String((item as any)?.mediaPublicId ?? "").trim();
    const mediaFileName = String((item as any)?.mediaFileName ?? "").trim() || null;
    const mediaMimeType = String((item as any)?.mediaMimeType ?? "").trim() || null;
    const rawMB = Number((item as any)?.mediaSizeMB ?? 0);
    const rawBytes = Number((item as any)?.mediaSizeBytes ?? (item as any)?.bytes ?? 0);
    const mediaSizeMB = rawMB > 0 ? rawMB : rawBytes / (1024 * 1024);
    if (!mediaUrl) throw new Error("ATTACHMENT_MEDIA_URL_REQUIRED");
    if (!mediaPublicId) throw new Error("ATTACHMENT_MEDIA_PUBLIC_ID_REQUIRED");
    if (mediaSizeMB <= 0) throw new Error("ATTACHMENT_MEDIA_SIZE_REQUIRED");
    validateAttachmentSize(type, mediaSizeMB);
    return { type, mediaUrl, mediaPublicId, mediaFileName, mediaMimeType, mediaSizeMB };
  });
}

async function cleanupB2Uploads(attachments: Array<{ mediaPublicId: string }>) {
  for (const attachment of attachments) {
    await deleteFromB2ByKey(attachment.mediaPublicId);
  }
}

export async function POST(req: Request) {
  let parsedAttachmentsForCleanup: IncomingAttachment[] = [];
  try {
    // 1) Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { email: normalizeEmail(session.user.email) },
      select: {
        id: true,
        name: true,
        email: true,
        storageUsedMB: true,
        storageLimitMB: true,
        identificationNo: true,
        phoneNumber: true,
        address: true,
        verificationStatus: true,
      },
    });

    if (!me) return Response.json({ error: "User not found." }, { status: 404 });

    if (!me.identificationNo || !me.phoneNumber || !me.address) {
      return Response.json({ error: "PROFILE_INCOMPLETE", message: "Please complete your profile before creating memories." }, { status: 403 });
    }

    if (me.verificationStatus !== "APPROVED") {
      return Response.json({ error: "NOT_VERIFIED", message: "Your account is pending admin verification." }, { status: 403 });
    }

    const body = await req.json();
    const collectionTitle = String(body.collectionTitle ?? "").trim();
    const itemTitle = String(body.itemTitle ?? "").trim();
    const itemContent = String(body.itemContent ?? "").trim();

    if (!collectionTitle) return Response.json({ error: "collectionTitle is required." }, { status: 400 });
    if (!itemTitle) return Response.json({ error: "itemTitle is required." }, { status: 400 });
    if (!itemContent) return Response.json({ error: "itemContent is required." }, { status: 400 });

    // 2) Parse attachments
    let attachments: IncomingAttachment[] = [];
    try {
      attachments = parseAttachments(body.attachments);
      parsedAttachmentsForCleanup = attachments;
    } catch (e) {
      const msg = (e as Error).message;
      return Response.json({ error: msg }, { status: 400 });
    }

    // 3) Parse receivers
    const receiversInput = Array.isArray(body.receivers) ? body.receivers : [];
    if (receiversInput.length === 0) {
      return Response.json({ error: "At least one receiver is required." }, { status: 400 });
    }

    for (const r of receiversInput) {
      const rIdNo = normalizeIdentificationNo(r.identificationNo ?? "");
      const rName = String(r.fullName ?? "").trim();
      const rAddress = String(r.address ?? "").trim();
      if (!rIdNo) return Response.json({ error: "Receiver identificationNo is required." }, { status: 400 });
      if (!rName) return Response.json({ error: "Receiver fullName is required." }, { status: 400 });
      if (!rAddress) return Response.json({ error: "Receiver address is required." }, { status: 400 });
    }

    // 4) Storage quota check
    const totalAttachmentMB = attachments.reduce((sum, a) => sum + a.mediaSizeMB, 0);
    const projectedUsedMB = me.storageUsedMB + totalAttachmentMB;
    if (projectedUsedMB > me.storageLimitMB) {
      if (attachments.length > 0) await cleanupB2Uploads(attachments.map((a) => ({ mediaPublicId: a.mediaPublicId })));
      return Response.json({ error: "Storage quota exceeded. Please upgrade your plan." }, { status: 400 });
    }

    const now = new Date();
    const createdCollections = [];

    // 5) Create memory + immediately release + send email for each receiver
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
          data: { fullName: rName, email: rEmail, phone: rPhone, address: rAddress, receiverType: rType, guardianName: gName, guardianNric: gNric, guardianEmail: gEmail, guardianPhone: gPhone, guardianAddress: gAddress } as any,
        });
      } else {
        receiver = await prisma.receiver.create({
          data: { ownerId: me.id, fullName: rName, email: rEmail, phone: rPhone, address: rAddress, identificationNo: rIdNo, receiverType: rType, guardianName: gName, guardianNric: gNric, guardianEmail: gEmail, guardianPhone: gPhone, guardianAddress: gAddress } as any,
        });
      }

      // Create collection with item immediately set to RELEASED
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
              status: "RELEASED",
              releasedAt: now,
              releaseDate: null,
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

      // Create invite token and send email immediately
      const { invite } = await createOrReuseReceiverInvite(receiver.id);

      if (invite) {
        await sendInviteDelivery(
          {
            fullName: receiver.fullName,
            email: receiver.email,
            phone: receiver.phone,
            address: receiver.address,
            identificationNo: receiver.identificationNo ?? undefined,
          },
          me.name ?? "Someone who cares",
          invite.token,
          collectionTitle,
          1,
          collection.id
        ).catch((err) =>
          console.error("[release-now] sendInviteDelivery failed:", err)
        );
      }
    }

    return Response.json(
      {
        message: `Memory created and delivered to ${createdCollections.length} receiver(s).`,
        memoryId: createdCollections[0]?.id,
        collections: createdCollections.map((c) => ({ id: c.id })),
      },
      { status: 201 }
    );

  } catch (err) {
    if (parsedAttachmentsForCleanup.length > 0) {
      await cleanupB2Uploads(parsedAttachmentsForCleanup.map((a) => ({ mediaPublicId: a.mediaPublicId })));
    }
    console.error("POST /api/memory/release-now error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
