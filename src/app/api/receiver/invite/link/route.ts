/**
 * src/app/api/receiver/invite/link/route.ts
 *
 * Purpose:
 * - Links an existing logged-in user's account to a receiver record
 * - Verifies NRIC matches the receiver record before linking
 * - Marks the invite as used after successful link
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const body = await req.json();
    const token = String(body.token ?? "").trim();

    if (!token) {
      return Response.json({ error: "Token is required." }, { status: 400 });
    }

    // Load logged-in user (need NRIC for verification)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true, email: true, identificationNo: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    if (!user.identificationNo) {
      return Response.json(
        { error: "Please complete your profile with your NRIC before claiming a memory." },
        { status: 400 }
      );
    }

    // Find and validate invite
    const invite = await prisma.receiverInvite.findUnique({
      where: { token },
      include: { receiver: true },
    });

    if (!invite) {
      return Response.json({ error: "Invite not found or has expired." }, { status: 404 });
    }

    if (invite.usedAt) {
      return Response.json({ error: "This invite has already been used." }, { status: 400 });
    }

    // Verify NRIC matches receiver record
    const normalizedUserNric = user.identificationNo.toUpperCase().replace(/\s/g, "");
    const normalizedReceiverNric = invite.receiver.identificationNo.toUpperCase().replace(/\s/g, "");

    if (normalizedUserNric !== normalizedReceiverNric) {
      return Response.json(
        { error: "Your identification number does not match our records for this invite." },
        { status: 400 }
      );
    }

    // Link user to receiver and mark invite as used
    await prisma.$transaction([
      prisma.receiver.update({
        where: { id: invite.receiverId },
        data: { linkedUserId: user.id },
      }),
      prisma.receiverInvite.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
    ]);

    return Response.json({ message: "Account linked successfully." });

  } catch (err) {
    console.error("POST /api/receiver/invite/link error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
