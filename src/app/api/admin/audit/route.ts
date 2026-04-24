/**
 * src/app/api/admin/audit/route.ts
 *
 * GET — list all audit log entries
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

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true, role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return Response.json({ error: "Admin only." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const actionFilter = searchParams.get("action") ?? "ALL";
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = 50;

    const where = actionFilter !== "ALL"
      ? { action: { contains: actionFilter } }
      : {};

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          performedBy: true,
          details: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Get user names for performedBy IDs
    const userIds = [...new Set(logs.map((l) => l.performedBy).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: { id: true, name: true, email: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const formatted = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      performedBy: log.performedBy
        ? userMap[log.performedBy] ?? { name: "Unknown", email: log.performedBy }
        : null,
      details: log.details ? JSON.parse(log.details) : null,
      createdAt: log.createdAt,
    }));

    return Response.json({
      logs: formatted,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });

  } catch (err) {
    console.error("GET /api/admin/audit error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
