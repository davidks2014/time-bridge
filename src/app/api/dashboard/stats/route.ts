import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true, storageUsedMB: true, storageLimitMB: true },
    });

    if (!me) return Response.json({ error: "Not found." }, { status: 404 });

    const [totalMemories, releasedMemories, totalReceivers] = await Promise.all([
      prisma.memoryItem.count({ where: { ownerId: me.id } }),
      prisma.memoryItem.count({ where: { ownerId: me.id, status: "RELEASED" } }),
      prisma.receiver.count({ where: { ownerId: me.id, collections: { some: {} } } }),
    ]);

    return Response.json({
      stats: {
        totalMemories,
        releasedMemories,
        totalReceivers,
        storageUsedMB: me.storageUsedMB,
        storageLimitMB: me.storageLimitMB,
      },
    });
  } catch (err) {
    console.error("GET /api/dashboard/stats error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
