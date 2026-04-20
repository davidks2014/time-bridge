/**
 * src/app/api/auth/complete-profile/route.ts
 *
 * Purpose:
 * - Called by Google users after first login
 * - Updates their profile with NRIC, phone, address
 * - Uploads verification documents to Cloudinary
 * - Saves consent records for PDPA compliance
 * - Sets verificationStatus to PENDING for admin review
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1) Must be logged in via Google
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

    // 3) Read form data
    const form = await req.formData();
    const phoneNumber = String(form.get("phoneNumber") ?? "").trim();
    const identificationNo = String(form.get("identificationNo") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const idFront = form.get("idFront");

    // Read consent flags
    const consentDataCollection = form.get("consentDataCollection") === "true";
    const consentLegacyDelivery = form.get("consentLegacyDelivery") === "true";
    const consentReceiverContact = form.get("consentReceiverContact") === "true";
    const consentTerms = form.get("consentTerms") === "true";

    // 4) Validate required fields
    if (!phoneNumber || !identificationNo || !address) {
      return Response.json(
        { error: "Phone number, NRIC and address are required." },
        { status: 400 }
      );
    }

    if (!(idFront instanceof File)) {
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

    // 5) Upload verification document to Cloudinary
    async function uploadToCloudinary(file: File, side: string): Promise<string> {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        throw new Error("Only JPG/PNG/WebP images are allowed.");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File too large. Max 5MB.");
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      const safeName = crypto.randomBytes(8).toString("hex");

      return new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "time-bridge/verification",
            resource_type: "image",
            transformation: [{ width: 1000, crop: "limit" }],
            public_id: `${identificationNo}_${side}_${Date.now()}_${safeName}`,
            overwrite: false,
          },
          (error, result) => {
            if (error || !result?.secure_url) {
              reject(new Error("Cloudinary upload failed."));
              return;
            }
            resolve(result.secure_url);
          }
        );
        stream.end(bytes);
      });
    }

    const verificationDocFrontUrl = await uploadToCloudinary(idFront, "front");

    const idBack = form.get("idBack");
    let verificationDocBackUrl: string | null = null;
    if (idBack instanceof File && idBack.size > 0) {
      verificationDocBackUrl = await uploadToCloudinary(idBack, "back");
    }

    // 6) Update user profile
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
    // If a match is found, a verification request is created automatically
    // so admin can link the receiver to this user account
    const { autoMatchNric } = await import("@/lib/nric-match");
    const matchResult = await autoMatchNric(user.id, identificationNo);

    if (matchResult.matchesFound > 0) {
      console.log(
        `[complete-profile] Auto-matched ${matchResult.matchesFound} receiver(s) for user ${user.id}`
      );
    }

    // 7) Save consent records for PDPA compliance
    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";

    await prisma.consentRecord.createMany({
      data: [
        { userId: user.id, consentType: "DATA_COLLECTION", ipAddress },
        { userId: user.id, consentType: "LEGACY_DELIVERY", ipAddress },
        { userId: user.id, consentType: "RECEIVER_CONTACT", ipAddress },
        { userId: user.id, consentType: "TERMS_AND_PRIVACY", ipAddress },
      ],
    });

    return Response.json({
      message: "Profile completed successfully. Awaiting admin verification.",
    });

  } catch (err: any) {
    console.error("complete-profile error:", err);
    const msg = String(err?.message ?? "");
    if (msg.includes("Only JPG") || msg.includes("Max 5MB") || msg.includes("Cloudinary")) {
      return Response.json({ error: msg }, { status: 400 });
    }
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
