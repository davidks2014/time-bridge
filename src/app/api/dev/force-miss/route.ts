import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/dev/force-miss
 *
 * Purpose (DEV ONLY):
 * - Increase missedConfirmations by 1 for the currently logged-in user
 * - Used for testing in Thunder Client
 *
 * Optional body:
 * { "times": 1 }  // default 1
 */

export async function POST(req: Request) {
  try {
    // 1) Must be logged in (so you can test your own account)
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    // 2) Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, missedConfirmations: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 3) Read optional "times"
    const body = await req.json().catch(() => ({}));
    const times = Number(body?.times ?? 1);

    if (!Number.isFinite(times) || times <= 0) {
      return Response.json({ error: "times must be a positive number." }, { status: 400 });
    }

    // 4) Increment missedConfirmations
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        missedConfirmations: { increment: Math.floor(times) },
      },
      select: { missedConfirmations: true, lastConfirmedAt: true },
    });

    return Response.json({
      message: "Forced missedConfirmations incremented.",
      missedConfirmations: updated.missedConfirmations,
      lastConfirmedAt: updated.lastConfirmedAt,
    });
  } catch (err) {
    console.error("force-miss error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}