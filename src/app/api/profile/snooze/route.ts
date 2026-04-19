/**
 * src/app/api/profile/snooze/route.ts
 *
 * POST   — activate holiday snooze for 30 or 60 days
 * DELETE — cancel active snooze
 *
 * When snoozedUntil is set and in the future,
 * the proof-of-life cron skips this user
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ── POST /api/profile/snooze ──────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const body = await req.json();
    const days = Number(body.days ?? 30);

    // Only allow 30 or 60 days — prevents abuse
    if (![30, 60].includes(days)) {
      return Response.json(
        { error: "Snooze duration must be 30 or 60 days." },
        { status: 400 }
      );
    }

    // Calculate snooze end date
    const snoozedUntil = new Date();
    snoozedUntil.setDate(snoozedUntil.getDate() + days);

    await prisma.user.update({
      where: { email: session.user.email.toLowerCase() },
      data: { snoozedUntil },
    });

    return Response.json({
      message: `Holiday snooze activated for ${days} days.`,
      snoozedUntil: snoozedUntil.toISOString(),
    });

  } catch (err) {
    console.error("POST /api/profile/snooze error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}

// ── DELETE /api/profile/snooze ────────────────────────────────────────────────

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    await prisma.user.update({
      where: { email: session.user.email.toLowerCase() },
      data: { snoozedUntil: null },
    });

    return Response.json({ message: "Holiday snooze cancelled." });

  } catch (err) {
    console.error("DELETE /api/profile/snooze error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
