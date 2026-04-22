/**
 * src/app/api/guardian/handover/route.ts
 *
 * POST — guardian transfers a memory to the child receiver directly
 *
 * Purpose:
 * - Guardian is currently linked to the receiver record (linkedUserId)
 * - Child has grown up and is ready to receive the memory directly
 * - Guardian initiates handover by providing the child's email
 * - System sends a new invite to the child's email
 * - When child claims — guardian's link is removed and child takes over
 *
 * Security:
 * - Must be logged in as the guardian (linkedUserId matches current user)
 * - Cannot hand over a memory that has already been handed over
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { sendReceiverInviteEmail } from "@/lib/email";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const INVITE_EXPIRE_DAYS = 90;

export async function POST(req: Request) {
  try {
    // 1) Must be logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const body = await req.json();
    const receiverId = String(body.receiverId ?? "").trim();
    const childEmail = String(body.childEmail ?? "").toLowerCase().trim();
    const childName = String(body.childName ?? "").trim();

    if (!receiverId) {
      return Response.json({ error: "receiverId is required." }, { status: 400 });
    }
    if (!childEmail) {
      return Response.json({ error: "Child email is required." }, { status: 400 });
    }
    if (!childName) {
      return Response.json({ error: "Child name is required." }, { status: 400 });
    }

    // 2) Find the logged-in user (guardian)
    const guardian = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true, name: true },
    });

    if (!guardian) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 3) Find the receiver record
    const receiver = await prisma.receiver.findUnique({
      where: { id: receiverId },
      select: {
        id: true,
        fullName: true,
        email: true,
        identificationNo: true,
        linkedUserId: true,
        receiverType: true,
        collections: {
          where: {
            items: { some: { status: "RELEASED" } },
          },
          select: {
            id: true,
            title: true,
            owner: { select: { name: true } },
            items: {
              where: { status: "RELEASED" },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!receiver) {
      return Response.json({ error: "Receiver not found." }, { status: 404 });
    }

    // 4) Verify the logged-in user is the current guardian (linkedUser)
    if (receiver.linkedUserId !== guardian.id) {
      return Response.json(
        { error: "You are not the current guardian for this receiver." },
        { status: 403 }
      );
    }

    // 5) Check child email is not already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: childEmail },
      select: { id: true },
    });

    if (existingUser) {
      // Child already has an account — link directly
      await prisma.receiver.update({
        where: { id: receiverId },
        data: {
          linkedUserId: existingUser.id,
          email: childEmail,
          fullName: childName,
          receiverType: "ADULT",
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "GUARDIAN_HANDOVER_DIRECT",
          entity: "Receiver",
          entityId: receiverId,
          performedBy: guardian.id,
          details: JSON.stringify({
            guardianName: guardian.name,
            childEmail,
            childName,
            note: "Child already had an account — linked directly",
          }),
        },
      });

      return Response.json({
        message: "Memory transferred directly to child's existing account.",
        handoverType: "DIRECT_LINK",
      });
    }

    // 6) Child does not have an account — create a new invite token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRE_DAYS);

    // Invalidate any existing unused invites for this receiver
    await prisma.receiverInvite.updateMany({
      where: { receiverId, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Create new invite for the child
    await prisma.receiverInvite.create({
      data: {
        token,
        receiverId,
        receiverEmail: childEmail,
        receiverName: childName,
      },
    });

    // Update receiver email to child's email for the invite
    await prisma.receiver.update({
      where: { id: receiverId },
      data: {
        email: childEmail,
        fullName: childName,
        receiverType: "ADULT",
      },
    });

    // 7) Send invite email to the child
    const collectionCount = receiver.collections.length;
    const senderName = receiver.collections[0]?.owner?.name ?? "Someone";
    const collectionTitle = receiver.collections[0]?.title ?? "A legacy message";

    const emailResult = await sendReceiverInviteEmail({
      receiverName: childName,
      receiverEmail: childEmail,
      senderName,
      inviteToken: token,
      collectionTitle,
      memoryCount: collectionCount,
    });

    // 8) Log the handover in AuditLog
    await prisma.auditLog.create({
      data: {
        action: "GUARDIAN_HANDOVER_INVITE",
        entity: "Receiver",
        entityId: receiverId,
        performedBy: guardian.id,
        details: JSON.stringify({
          guardianName: guardian.name,
          childEmail,
          childName,
          emailSent: emailResult.success,
          collectionsCount: collectionCount,
        }),
      },
    });

    return Response.json({
      message: `Handover initiated. An invite has been sent to ${childEmail}.`,
      handoverType: "INVITE_SENT",
      emailSent: emailResult.success,
    });

  } catch (err) {
    console.error("POST /api/guardian/handover error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
