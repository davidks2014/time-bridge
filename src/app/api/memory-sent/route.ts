import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

function normalizeEmail(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

/**
 * API: GET /api/memory-sent
 *
 * Purpose:
 * - Return all memory collections created by the logged-in owner
 * - Each collection includes its items and each item's attachments
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const email = normalizeEmail(session.user.email);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const memories = await prisma.memoryCollection.findMany({
      where: {
        ownerId: user.id,
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

        receiver: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            address: true,
            identificationNo: true,
            linkedUserId: true,
          },
        },

        items: {
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

            attachments: {
              orderBy: {
                createdAt: "asc",
              },
              select: {
                id: true,
                type: true,
                mediaUrl: true,
                mediaPublicId: true,
                mediaFileName: true,
                mediaMimeType: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    const formatted = memories.map((memory) => ({
      id: memory.id,
      title: memory.title,
      status: memory.status,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,

      receiver: memory.receiver,

      items: memory.items.map((item) => ({
        id: item.id,
        title: item.title,
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

    return Response.json({
      memories: formatted,
    });
  } catch (err) {
    console.error("GET /api/memory-sent error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}