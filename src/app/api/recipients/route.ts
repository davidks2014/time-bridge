/**
 * API: GET /api/recipients
 * Purpose: Return paginated list of all recipients for the logged-in user
 * with their linked memories, claim status, and guardian info.
 */
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });
    if (!user) return Response.json({ error: "User not found." }, { status: 404 });

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "10")));
    const skip = (page - 1) * limit;

    const total = await prisma.receiver.count({ where: { ownerId: user.id } });

    const receivers = await prisma.receiver.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        fullName: true,
        identificationNo: true,
        email: true,
        phone: true,
        address: true,
        receiverType: true,
        linkedUserId: true,
        guardianName: true,
        guardianNric: true,
        guardianEmail: true,
        guardianPhone: true,
        guardianAddress: true,
        createdAt: true,
        collections: {
          select: {
            id: true,
            title: true,
            items: {
              select: {
                id: true,
                title: true,
                status: true,
                releaseDate: true,
                releasedAt: true,
              },
            },
          },
        },
      },
    });

    const formatted = receivers.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      identificationNo: r.identificationNo,
      email: r.email,
      phone: r.phone,
      address: r.address,
      receiverType: r.receiverType,
      isClaimed: !!r.linkedUserId,
      guardianName: r.guardianName,
      guardianNric: r.guardianNric,
      guardianEmail: r.guardianEmail,
      guardianPhone: r.guardianPhone,
      guardianAddress: r.guardianAddress,
      createdAt: r.createdAt,
      collections: r.collections.map((c) => ({
        id: c.id,
        title: c.title,
        totalItems: c.items.length,
        releasedItems: c.items.filter((i) => i.status === "RELEASED").length,
        items: c.items.map((i) => ({
          id: i.id,
          title: i.title,
          status: i.status,
          releaseDate: i.releaseDate,
          releasedAt: i.releasedAt,
        })),
      })),
    }));

    return Response.json({
      recipients: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("GET /api/recipients error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
