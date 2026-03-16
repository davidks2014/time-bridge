import { prisma } from "@/lib/prisma";

/**
 * POST /api/dev/force-miss-by-email
 *
 * DEV ONLY:
 * - Increase missedConfirmations for a specific user by email
 *
 * Body:
 * {
 *   "email": "davidks2014@gmail.com",
 *   "times": 1
 * }
 */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const email = String(body?.email ?? "")
      .toLowerCase()
      .trim();

    const times = Number(body?.times ?? 1);

    if (!email) {
      return Response.json({ error: "email is required." }, { status: 400 });
    }

    if (!Number.isFinite(times) || times <= 0) {
      return Response.json({ error: "times must be a positive number." }, { status: 400 });
    }

    // 1) Ensure user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, missedConfirmations: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 2) Increment missedConfirmations
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        missedConfirmations: { increment: Math.floor(times) },
      },
      select: {
        email: true,
        missedConfirmations: true,
        lastConfirmedAt: true,
      },
    });

    return Response.json({
      message: "Missed confirmations increased (DEV).",
      user: updated,
    });
  } catch (err) {
    console.error("force-miss-by-email error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}