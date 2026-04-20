/**
 * src/app/api/memory/recall/route.ts
 *
 * POST — emergency recall of a released memory
 *
 * Purpose:
 * - Sender can recall a released memory within 24 hours
 * - Only works if receiver has not yet opened/claimed the memory
 * - Sets memory back to DRAFT status
 * - Invalidates the invite token
 * - Sends confirmation email to sender
 *
 * Rules:
 * - Must be the memory owner (sender)
 * - Memory must be in RELEASED status
 * - Must be within 24 hours of releasedAt
 * - Receiver must not have opened/claimed the memory yet
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1) Must be logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const body = await req.json();
    const collectionId = String(body.collectionId ?? "").trim();

    if (!collectionId) {
      return Response.json(
        { error: "collectionId is required." },
        { status: 400 }
      );
    }

    // 2) Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 3) Find the memory collection and verify ownership
    const collection = await prisma.memoryCollection.findUnique({
      where: { id: collectionId },
      select: {
        id: true,
        title: true,
        ownerId: true,
        receiver: {
          select: {
            id: true,
            fullName: true,
            linkedUserId: true,
          },
        },
        items: {
          where: { status: "RELEASED" },
          select: {
            id: true,
            title: true,
            status: true,
            releasedAt: true,
          },
        },
      },
    });

    if (!collection) {
      return Response.json({ error: "Memory not found." }, { status: 404 });
    }

    // 4) Verify ownership — only sender can recall
    if (collection.ownerId !== user.id) {
      return Response.json(
        { error: "You can only recall your own memories." },
        { status: 403 }
      );
    }

    // 5) Check there are released items to recall
    if (collection.items.length === 0) {
      return Response.json(
        { error: "No released memories found to recall." },
        { status: 400 }
      );
    }

    // 6) Check 24-hour window
    const now = new Date();
    const earliestRelease = collection.items.reduce((earliest, item) => {
      if (!item.releasedAt) return earliest;
      return !earliest || item.releasedAt < earliest ? item.releasedAt : earliest;
    }, null as Date | null);

    if (!earliestRelease) {
      return Response.json(
        { error: "Release timestamp not found." },
        { status: 400 }
      );
    }

    const hoursSinceRelease =
      (now.getTime() - earliestRelease.getTime()) / (1000 * 60 * 60);

    if (hoursSinceRelease > 24) {
      return Response.json(
        {
          error: `The 24-hour recall window has passed. This memory was released ${Math.floor(hoursSinceRelease)} hours ago and can no longer be recalled.`,
        },
        { status: 400 }
      );
    }

    // 7) Check receiver has not already claimed/opened the memory
    if (collection.receiver.linkedUserId) {
      return Response.json(
        {
          error:
            "This memory cannot be recalled because the receiver has already claimed their account and may have accessed it.",
        },
        { status: 400 }
      );
    }

    // 8) Recall the memory — set all released items back to DRAFT
    await prisma.memoryItem.updateMany({
      where: {
        collectionId,
        status: "RELEASED",
      },
      data: {
        status: "DRAFT",
        releasedAt: null,
        releaseDate: null,
      },
    });

    // 9) Invalidate any active invite tokens for this receiver
    await prisma.receiverInvite.updateMany({
      where: {
        receiverId: collection.receiver.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // 10) Log the recall in AuditLog
    await prisma.auditLog.create({
      data: {
        action: "MEMORY_RECALLED",
        entity: "MemoryCollection",
        entityId: collectionId,
        performedBy: user.id,
        details: JSON.stringify({
          collectionTitle: collection.title,
          receiverName: collection.receiver.fullName,
          hoursSinceRelease: Math.round(hoursSinceRelease * 10) / 10,
          itemsRecalled: collection.items.length,
        }),
      },
    });

    // 11) Send confirmation email to sender
    const { sendMemoryRecalledEmail } = await import("@/lib/email");
    await sendMemoryRecalledEmail({
      senderName: user.name,
      senderEmail: user.email,
      collectionTitle: collection.title,
      receiverName: collection.receiver.fullName,
      itemCount: collection.items.length,
    }).catch((err) =>
      console.error("[recall] Confirmation email failed:", err)
    );

    return Response.json({
      message: "Memory recalled successfully. It has been moved back to draft.",
      itemsRecalled: collection.items.length,
      collectionTitle: collection.title,
    });

  } catch (err) {
    console.error("POST /api/memory/recall error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
