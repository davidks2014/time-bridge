import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Normalize email to avoid case mismatch issues.
 */
function normalizeEmail(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

/**
 * GET /api/storage-summary
 *
 * Purpose:
 * - return current logged-in user's storage usage
 * - used bytes
 * - limit bytes
 * - remaining bytes
 * - usage percentage
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: normalizeEmail(session.user.email),
      },
      select: {
        id: true,
        storageUsedBytes: true,
        storageLimitBytes: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const usedBytes = BigInt(user.storageUsedBytes);
    const limitBytes = BigInt(user.storageLimitBytes);
    const remainingBytes = limitBytes > usedBytes ? limitBytes - usedBytes : BigInt(0);

    const usagePercent =
      limitBytes > BigInt(0)
        ? Number((usedBytes * BigInt(100)) / limitBytes)
        : 0;

    return Response.json({
      storageUsedBytes: usedBytes.toString(),
      storageLimitBytes: limitBytes.toString(),
      storageRemainingBytes: remainingBytes.toString(),
      storageUsagePercent: usagePercent,
    });
  } catch (err) {
    console.error("GET /api/storage-summary error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}