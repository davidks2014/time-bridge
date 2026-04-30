/**
 * API: POST /api/media/confirm-upload
 *
 * Purpose: Called by the frontend AFTER a successful direct-to-B2 presigned upload
 * to report the file size so we can increment the user's storageUsedMB.
 *
 * The presigned upload flow bypasses the server, so the server cannot measure
 * the file size during upload. The frontend reports it here after the PUT succeeds.
 *
 * Request body: { sizeMB: number }
 * Response: { message: string }
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { incrementStorage } from "@/lib/storageTracking";

export const dynamic = "force-dynamic";

function normalizeEmail(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(session.user.email) },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const sizeMB = Number(body?.sizeMB ?? 0);

    if (sizeMB <= 0) {
      return Response.json({ error: "sizeMB must be greater than 0." }, { status: 400 });
    }

    await incrementStorage(user.id, Math.round(sizeMB * 1024 * 1024));

    return Response.json({ message: "Storage updated." });
  } catch (err) {
    console.error("POST /api/media/confirm-upload error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
