/**
 * src/app/api/receiver/invite/claim/route.ts
 *
 * Purpose:
 * - Process a receiver's claim for an invite
 * - Creates a new user account for the receiver
 * - Uploads verification documents to B2 storage
 * - Creates an identity verification request for admin review
 * - Records consent for PDPA compliance
 *
 * After this:
 * - Admin reviews the claim in /admin/verification
 * - On approval, receiver.linkedUserId is set
 * - Receiver can then log in and view their memory
 */

import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { uploadToB2 } from "@/lib/b2Storage";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    // Read all form fields
    const token = String(form.get("token") ?? "").trim();
    const email = String(form.get("email") ?? "").toLowerCase().trim();
    const password = String(form.get("password") ?? "");
    const identificationNo = String(form.get("identificationNo") ?? "").trim();
    const phoneNumber = String(form.get("phoneNumber") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const consentAgreed = form.get("consentAgreed") === "true";

    const idFront = form.get("idFront");
    const idBack = form.get("idBack");

    // Validate required fields
    if (!token) return Response.json({ error: "Token is required." }, { status: 400 });
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
    if (!(idFront instanceof File)) {
      return Response.json({ error: "NRIC front image is required." }, { status: 400 });
    }
    if (!consentAgreed) {
      return Response.json({ error: "Consent is required." }, { status: 400 });
    }

    // Find and validate the invite token
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

    // Verify NRIC matches what the sender recorded
    // This is the key identity check — only the correct person knows their own NRIC
    const normalizedSubmitted = identificationNo.toUpperCase().replace(/\s/g, "");
    const normalizedExpected = invite.receiver.identificationNo.toUpperCase().replace(/\s/g, "");

    if (normalizedSubmitted !== normalizedExpected) {
      return Response.json(
        { error: "Your identification number does not match our records for this invite." },
        { status: 400 }
      );
    }

    // Check if email is already registered
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

    // Upload verification documents to B2
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

      return uploadToB2(bytes, fileName, file.type, "documents");
    }

    const idImageFrontUrl = await uploadDocument(idFront, "front");

    let idImageBackUrl: string | null = null;
    if (idBack instanceof File && idBack.size > 0) {
      idImageBackUrl = await uploadDocument(idBack, "back");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user account for the receiver
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: invite.receiver.fullName,
        phoneNumber,
        address,
        identificationNo: invite.receiver.identificationNo,
        // Receiver accounts start as PENDING until admin verifies
        verificationStatus: "PENDING",
        // Store verification documents
        verificationDocFrontUrl: idImageFrontUrl,
        verificationDocBackUrl: idImageBackUrl,
      },
    });

    // Save consent record for PDPA compliance
    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
    await prisma.consentRecord.create({
      data: {
        userId: user.id,
        consentType: "RECEIVER_CONTACT",
        ipAddress,
      },
    });

    // Create identity verification request for admin review
    const verification = await prisma.identityVerificationRequest.create({
      data: {
        receiverId: invite.receiverId,
        requesterUserId: user.id,
        inviteTokenUsed: token,
        identificationNoSubmitted: identificationNo,
        idImageFrontUrl,
        idImageBackUrl,
      },
    });

    // Mark invite as used so it cannot be claimed again
    await prisma.receiverInvite.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    return Response.json({
      message: "Claim submitted successfully. Our team will verify your identity and approve your access.",
      verificationId: verification.id,
    });

  } catch (err: any) {
    console.error("POST /api/receiver/invite/claim error:", err);
    const msg = String(err?.message ?? "");
    if (msg.includes("Only JPG") || msg.includes("Max 5MB") || msg.includes("upload")) {
      return Response.json({ error: msg }, { status: 400 });
    }
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
