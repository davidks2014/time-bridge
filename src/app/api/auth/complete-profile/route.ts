/**
 * src/app/api/auth/complete-profile/route.ts
 *
 * Purpose:
 * - Called by Google users after first login
 * - Accepts pre-uploaded B2 CDN URLs for verification documents
 * - Updates profile with NRIC, phone, address
 * - Saves consent records for PDPA compliance
 * - Sets verificationStatus to PENDING for admin review
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1) Must be logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const email = session.user.email.toLowerCase().trim();

    // 2) Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, identificationNo: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 3) Read JSON body — files are pre-uploaded to B2 by the browser
    const body = await req.json().catch(() => ({}));

    const phoneNumber      = String(body.phoneNumber      ?? "").trim();
    const identificationNo = String(body.identificationNo ?? "").trim();
    const address          = String(body.address          ?? "").trim();
    const verificationDocFrontUrl = String(body.verificationDocFrontUrl ?? "").trim();
    const verificationDocBackUrl  = body.verificationDocBackUrl
      ? String(body.verificationDocBackUrl).trim()
      : null;

    const consentDataCollection  = body.consentDataCollection  === true;
    const consentLegacyDelivery  = body.consentLegacyDelivery  === true;
    const consentReceiverContact = body.consentReceiverContact === true;
    const consentTerms           = body.consentTerms           === true;

    // 4) Validate required fields
    if (!phoneNumber || !identificationNo || !address) {
      return Response.json(
        { error: "Phone number, NRIC and address are required." },
        { status: 400 }
      );
    }

    if (!verificationDocFrontUrl) {
      return Response.json(
        { error: "Verification image (front) is required." },
        { status: 400 }
      );
    }

    if (!consentDataCollection || !consentLegacyDelivery || !consentReceiverContact || !consentTerms) {
      return Response.json(
        { error: "All consent checkboxes must be agreed to." },
        { status: 400 }
      );
    }

    // 5) Update user profile
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneNumber,
        identificationNo,
        address,
        verificationDocFrontUrl,
        verificationDocBackUrl,
        verificationStatus: "PENDING",
      },
    });

    // Auto-match NRIC against released memories
    const { autoMatchNric } = await import("@/lib/nric-match");
    const matchResult = await autoMatchNric(user.id, identificationNo);

    if (matchResult.matchesFound > 0) {
      console.log(
        `[complete-profile] Auto-matched ${matchResult.matchesFound} receiver(s) for user ${user.id}`
      );
    }

    // 6) Save consent records for PDPA compliance
    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";

    await prisma.consentRecord.createMany({
      data: [
        { userId: user.id, consentType: "DATA_COLLECTION",   ipAddress },
        { userId: user.id, consentType: "LEGACY_DELIVERY",   ipAddress },
        { userId: user.id, consentType: "RECEIVER_CONTACT",  ipAddress },
        { userId: user.id, consentType: "TERMS_AND_PRIVACY", ipAddress },
      ],
    });

    return Response.json({
      message: "Profile completed successfully. Awaiting admin verification.",
    });

  } catch (err: any) {
    console.error("complete-profile error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
