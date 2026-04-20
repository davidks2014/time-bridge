/**
 * src/app/api/auth/record-device/route.ts
 *
 * POST — records device fingerprint after login
 *
 * Called by the login page after successful authentication.
 * Checks if this is a new device and alerts admin if the user
 * is in WARNING or CRITICAL proof-of-life stage.
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateFingerprintHash,
  getDeviceLabel,
  checkAndRecordFingerprint,
} from "@/lib/device-fingerprint";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1) Must be logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    // 2) Get user details including proof-of-life stage
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        proofOfLifeStage: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 3) Generate fingerprint from request headers
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const fingerprintHash = generateFingerprintHash(userAgent, ipAddress);
    const deviceLabel = getDeviceLabel(userAgent);

    // 4) Check and record the fingerprint
    const { isNewDevice, flagged } = await checkAndRecordFingerprint({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      proofOfLifeStage: user.proofOfLifeStage,
      fingerprintHash,
      deviceLabel,
    });

    return Response.json({
      message: "Device recorded.",
      isNewDevice,
      flagged,
      deviceLabel,
    });

  } catch (err) {
    console.error("POST /api/auth/record-device error:", err);
    // Non-blocking — never fail login because of fingerprint error
    return Response.json({ message: "Device recording skipped." });
  }
}
