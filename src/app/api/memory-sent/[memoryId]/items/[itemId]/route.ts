/**
 * API: /api/memory-sent/[memoryId]/items/[itemId]
 *
 * Purpose:
 * - PATCH: Sender edits 1 item (owner only)
 *
 * Rule:
 * - If ANY item in this memory is RELEASED -> memory LOCKED -> cannot edit
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ memoryId: string; itemId: string }> };
type MemoryItemStatus = "DRAFT" | "RELEASED";
type ItemType = "TEXT" | "VIDEO";

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { memoryId, itemId } = await params;

    // 1) Must be logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    // 2) Find current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });
    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 3) Fetch memory (must belong to user) with all item statuses
    const memory = await prisma.memoryCollection.findFirst({
      where: { id: memoryId, ownerId: user.id },
      include: {
        items: { select: { id: true, status: true } },
      },
    });

    if (!memory) {
      return Response.json(
        { error: "Memory not found (or not owned by you)." },
        { status: 404 }
      );
    }

    // 4) LOCK RULE: if any RELEASED -> block edit
    const hasReleasedItem = memory.items.some(
      (i: { status: MemoryItemStatus }) => i.status === "RELEASED"
    );
    if (hasReleasedItem) {
      return Response.json(
        { error: "This memory is locked. You cannot edit after any message is released." },
        { status: 400 }
      );
    }

    // 5) Fetch the item (must belong to this memory + owner)
    const item = await prisma.memoryItem.findFirst({
      where: { id: itemId, collectionId: memoryId, ownerId: user.id },
      select: { id: true, type: true, status: true },
    });

    if (!item) {
      return Response.json({ error: "Item not found." }, { status: 404 });
    }

    // Extra safety: item itself already released -> block edit
    if (item.status === "RELEASED") {
      return Response.json(
        { error: "This item is already released and cannot be edited." },
        { status: 400 }
      );
    }

    // 6) Read payload
    const body = await req.json();

    const title = String(body.title ?? "").trim();
    const content = body.content === undefined ? undefined : String(body.content ?? "").trim();
    const releaseDateRaw = body.releaseDate === undefined ? undefined : body.releaseDate;

    if (!title) {
      return Response.json({ error: "title is required." }, { status: 400 });
    }

    // releaseDate:
    // - null means "proof-of-life rule"
    // - string must be valid date
    let releaseDate: Date | null | undefined = undefined;
    if (releaseDateRaw === null) {
      releaseDate = null;
    } else if (typeof releaseDateRaw === "string") {
      const d = new Date(releaseDateRaw);
      if (Number.isNaN(d.getTime())) {
        return Response.json(
          { error: "Invalid releaseDate format. Use ISO string or null." },
          { status: 400 }
        );
      }
      releaseDate = d;
    } else if (releaseDateRaw !== undefined) {
      return Response.json(
        { error: "releaseDate must be ISO string or null." },
        { status: 400 }
      );
    }

    // TEXT rules
    if ((item.type as ItemType) === "TEXT") {
      if (content !== undefined && !content) {
        return Response.json({ error: "content cannot be empty for TEXT." }, { status: 400 });
      }
    }

    // 7) Update
    const updated = await prisma.memoryItem.update({
      where: { id: item.id },
      data: {
        title,
        ...(content !== undefined ? { content } : {}),
        ...(releaseDate !== undefined ? { releaseDate } : {}),
      },
    });

    return Response.json({ item: updated });
  } catch (err) {
    console.error("PATCH /api/memory-sent/[memoryId]/items/[itemId] error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}