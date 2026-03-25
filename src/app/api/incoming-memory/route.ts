import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * API: GET /api/incoming-memory
 *
 * Purpose:
 * - Show unreleased memory cards/messages that are intended for the logged-in receiver
 * - Receiver can know there are incoming memories, but cannot see content until released
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const email = String(session.user.email).toLowerCase().trim();

    // 1) Find current logged-in user
    const me = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (!me) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 2) Find receiver records linked to this user
    const linkedReceivers = await prisma.receiver.findMany({
      where: {
        linkedUserId: me.id,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    const receiverIds = linkedReceivers.map((r) => r.id);

    if (receiverIds.length === 0) {
      return Response.json({
        incomingCount: 0,
        memories: [],
      });
    }

    // 3) Get memory collections for those linked receivers
    //    Only include items still unreleased (DRAFT)
    const collections = await prisma.memoryCollection.findMany({
      where: {
        receiverId: { in: receiverIds },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        items: {
          where: {
            status: "DRAFT",
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            title: true,
            content: true,
            releaseDate: true,
            releasedAt: true,
            status: true,
            createdAt: true,
            updatedAt: true,

            // New attachment-based model
            attachments: {
              select: {
                id: true,
                type: true,
                mediaUrl: true,
                mediaPublicId: true,
                mediaFileName: true,
                mediaMimeType: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    });

    // 4) Keep only collections that still have incoming unreleased items
    const memories = collections
      .filter((collection) => collection.items.length > 0)
      .map((collection) => ({
        id: collection.id,
        title: collection.title,
        status: collection.status,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        sender: {
          id: collection.owner.id,
          name: collection.owner.name,
          email: collection.owner.email,
        },
        receiver: {
          id: collection.receiver.id,
          fullName: collection.receiver.fullName,
          email: collection.receiver.email,
        },
        items: collection.items.map((item) => ({
          id: item.id,
          title: item.title,

          // For incoming memory, you may or may not show content preview.
          // Keeping it in payload for flexibility; UI can hide it until released.
          content: item.content,

          releaseDate: item.releaseDate,
          releasedAt: item.releasedAt,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,

          attachments: item.attachments,
          attachmentCount: item.attachments.length,
        })),
      }));

    const incomingCount = memories.reduce((sum, memory) => sum + memory.items.length, 0);

    return Response.json({
      incomingCount,
      memories,
    });
  } catch (err) {
    console.error("GET /api/incoming-memory error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}