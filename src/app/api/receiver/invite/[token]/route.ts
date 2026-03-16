/**
 * API: GET /api/receiver/invite/[token]
 *
 * Purpose:
 * - Validate an invite token
 * - Return info for the invite claim UI:
 *   - receiverEmail / receiverName (what sender entered)
 *   - senderName / senderEmail (owner of receiver record)
 *
 * Next.js 16:
 * - params is a Promise -> must await it
 */

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    // 1) Unwrap params (Next.js 16)
    const { token } = await params;

    // 2) Basic validation
    if (!token || typeof token !== "string") {
      return Response.json({ error: "Invalid token." }, { status: 400 });
    }

    // 3) Find invite by token
    const invite = await prisma.receiverInvite.findUnique({
      where: { token },
      include: {
        receiver: {
          include: {
            owner: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!invite) {
      return Response.json({ error: "Invite not found." }, { status: 404 });
    }

    // 4) Optional: block if already used
    if (invite.usedAt) {
      return Response.json({ error: "Invite already used." }, { status: 400 });
    }

    // 5) Return data for UI page
    return Response.json({
      invite: {
        token: invite.token,
        receiverEmail: invite.receiverEmail,
        receiverName: invite.receiverName ?? invite.receiver.fullName, // fallback
        senderName: invite.receiver.owner?.name ?? null,
        senderEmail: invite.receiver.owner?.email ?? null,
      },
    });
  } catch (err) {
    console.error("GET /api/receiver/invite/[token] error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}