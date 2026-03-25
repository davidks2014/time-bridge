import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * API: GET /api/memory-received
 *
 * Purpose:
 * - Return released memory items that belong to receivers linked to the logged-in user
 * - Uses attachment-based model:
 *   MemoryItem = text message
 *   MemoryAttachment[] = image/video attachments
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const email = String(session.user.email).toLowerCase().trim();

    // 1) Get current logged-in user
    const me = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
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
      },
    });

    const receiverIds = linkedReceivers.map((r) => r.id);

    if (receiverIds.length === 0) {
      return Response.json({
        receivedCount: 0,
        items: [],
      });
    }

    // 3) Find collections + released items for those receivers
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
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          where: {
            status: "RELEASED",
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

            // ✅ attachments now hold IMAGE / VIDEO media
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

    // 4) Flatten all released items
    const items = collections.flatMap((memory) =>
      memory.items.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        releaseDate: item.releaseDate,
        releasedAt: item.releasedAt,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,

        sender: {
          name: memory.owner.name,
          email: memory.owner.email,
        },

        memory: {
          id: memory.id,
          title: memory.title,
        },

        attachments: item.attachments,
        attachmentCount: item.attachments.length,
      }))
    );

    return Response.json({
      receivedCount: items.length,
      items,
    });
  } catch (err) {
    console.error("GET /api/memory-received error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}