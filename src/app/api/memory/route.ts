/**
 * API: POST /api/memory
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { email: normalizeEmail(session.user.email) },
      select: { id: true, email: true },
    });

    if (!me) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const body = await req.json();

    const collectionTitle = String(body.collectionTitle ?? "").trim();
    const itemTitle = String(body.itemTitle ?? "").trim();
    const itemContent = String(body.itemContent ?? "").trim();

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
      return Response.json({ error: "itemContent is required." }, { status: 400 });
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
          type: "TEXT",
          title: itemTitle,
          content: itemContent,
          releaseDate,
        },
        select: { id: true, status: true },
      });

      return { memoryId: memory.id, itemId: item.id, itemStatus: item.status };
    });

    return Response.json(
      {
        message: "Memory created.",
        memoryId: result.memoryId,
        itemId: result.itemId,
        itemStatus: result.itemStatus,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/memory error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}