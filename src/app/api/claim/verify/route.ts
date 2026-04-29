/**
 * src/app/api/claim/verify/route.ts
 *
 * POST — manual self-claim verification
 *
 * Purpose:
 * - Creates a user account for the receiver
 * - Uploads verification documents to B2 storage
 * - Creates an identity verification request for admin review
 * - Used when no invite token exists (receiver found memory via /claim)
 */

import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { uploadToB2 } from "@/lib/b2Storage";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const email = String(form.get("email") ?? "").toLowerCase().trim();
    const password = String(form.get("password") ?? "");
    const identificationNo = String(form.get("identificationNo") ?? "")
      .trim()
      .toUpperCase();
    const phoneNumber = String(form.get("phoneNumber") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const receiverId = String(form.get("receiverId") ?? "").trim();
    const consentAgreed = form.get("consentAgreed") === "true";
    const idFront = form.get("idFront");

    // Validate required fields
    if (!email) return Response.json({ error: "Email is required." }, { status: 400 });
    if (!password || password.length < 8) {
      return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (!identificationNo) {
      return Response.json({ error: "NRIC is required." }, { status: 400 });
    }
    if (!phoneNumber) {
      return Response.json({ error: "Phone number is required." }, { status: 400 });
    }
    if (!address) {
      return Response.json({ error: "Address is required." }, { status: 400 });
    }
    if (!receiverId) {
      return Response.json({ error: "Receiver ID is required." }, { status: 400 });
    }
    if (!(idFront instanceof File)) {
      return Response.json({ error: "NRIC front image is required." }, { status: 400 });
    }
    if (!consentAgreed) {
      return Response.json({ error: "Consent is required." }, { status: 400 });
    }

    // Find and validate the receiver record
    const receiver = await prisma.receiver.findUnique({
      where: { id: receiverId },
      select: {
        id: true,
        fullName: true,
        identificationNo: true,
        linkedUserId: true,
      },
    });

    if (!receiver) {
      return Response.json({ error: "Receiver record not found." }, { status: 404 });
    }

    // Verify NRIC matches
    if (
      identificationNo.toUpperCase() !==
      receiver.identificationNo.toUpperCase()
    ) {
      return Response.json(
        { error: "Your NRIC does not match our records for this memory." },
        { status: 400 }
      );
    }

    // Check receiver is not already linked
    if (receiver.linkedUserId) {
      return Response.json(
        { error: "This memory has already been claimed." },
        { status: 409 }
      );
    }

    // Check email is not already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return Response.json(
        { error: "An account with this email already exists. Please log in instead." },
        { status: 409 }
      );
    }

    // Upload NRIC to B2
    async function uploadDocument(file: File, side: string): Promise<string> {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        throw new Error("Only JPG/PNG/WebP images are allowed.");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File too large. Max 5MB.");
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      const safeName = crypto.randomBytes(8).toString("hex");
      const fileName = `${identificationNo}_${side}_${Date.now()}_${safeName}`;

      const { url } = await uploadToB2(bytes, fileName, file.type, "documents");
      return url;
    }

    const idImageFrontUrl = await uploadDocument(idFront, "front");

    const idBack = form.get("idBack");
    let idImageBackUrl: string | null = null;
    if (idBack instanceof File && idBack.size > 0) {
      idImageBackUrl = await uploadDocument(idBack, "back");
    }

    // Create user account
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: receiver.fullName,
        phoneNumber,
        address,
        identificationNo: receiver.identificationNo,
        verificationStatus: "PENDING",
        verificationDocFrontUrl: idImageFrontUrl,
        verificationDocBackUrl: idImageBackUrl,
      },
    });

    // Save consent record
    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
    await prisma.consentRecord.create({
      data: {
        userId: user.id,
        consentType: "RECEIVER_CONTACT",
        ipAddress,
      },
    });

    // Create identity verification request for admin review
    await prisma.identityVerificationRequest.create({
      data: {
        receiverId: receiver.id,
        requesterUserId: user.id,
        identificationNoSubmitted: identificationNo,
        idImageFrontUrl,
        idImageBackUrl,
      },
    });

    return Response.json({
      message: "Claim submitted. Our team will verify your identity within 1-2 business days.",
    });

  } catch (err: any) {
    console.error("POST /api/claim/verify error:", err);
    const msg = String(err?.message ?? "");
    if (msg.includes("Only JPG") || msg.includes("Max 5MB") || msg.includes("upload")) {
      return Response.json({ error: msg }, { status: 400 });
    }
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
