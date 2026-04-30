/**
 * src/app/api/profile/route.ts
 *
 * GET    — load user profile settings
 * PATCH  — update trusted contact and proof-of-life interval
 * DELETE — request account deletion (marks for deletion, PDPA 30-day purge)
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ── GET /api/profile ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: {
        name: true,
        email: true,
        phoneNumber: true,
        identificationNo: true,
        address: true,
        confirmationIntervalDays: true,
        trustedContactName: true,
        trustedContactNric: true,
        trustedContactEmail: true,
        trustedContactPhone: true,
        snoozedUntil: true,
        storageUsedMB: true,
        storageLimitMB: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    return Response.json({ profile: user });

  } catch (err) {
    console.error("GET /api/profile error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}

// ── PATCH /api/profile ────────────────────────────────────────────────────────

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const body = await req.json();

    // Validate confirmation interval — must be 30, 60, or 90
    const confirmationIntervalDays = Number(body.confirmationIntervalDays ?? 30);
    if (![30, 60, 90].includes(confirmationIntervalDays)) {
      return Response.json(
        { error: "Confirmation interval must be 30, 60, or 90 days." },
        { status: 400 }
      );
    }

    // Trusted contact fields — all optional, null clears the field
    const trustedContactName = body.trustedContactName ?? null;
    const trustedContactNric = body.trustedContactNric ?? null;
    const trustedContactEmail = body.trustedContactEmail ?? null;
    const trustedContactPhone = body.trustedContactPhone ?? null;

    await prisma.user.update({
      where: { email: session.user.email.toLowerCase() },
      data: {
        confirmationIntervalDays,
        trustedContactName,
        trustedContactNric,
        trustedContactEmail,
        trustedContactPhone,
      },
    });

    return Response.json({ message: "Profile settings updated successfully." });

  } catch (err) {
    console.error("PATCH /api/profile error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}

// ── DELETE /api/profile ───────────────────────────────────────────────────────
// Marks the account for deletion — actual purge happens within 30 days (PDPA)

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    // For now we immediately delete — in Phase 3 we will add a 30-day soft delete
    // which is the PDPA compliant approach
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // Delete user — cascade deletes all related memories, receivers, attachments
    await prisma.user.delete({
      where: { id: user.id },
    });

    return Response.json({ message: "Account deleted successfully." });

  } catch (err) {
    console.error("DELETE /api/profile error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
