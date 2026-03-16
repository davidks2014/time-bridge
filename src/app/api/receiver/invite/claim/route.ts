import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "identity");

async function saveUpload(file: File, prefix: string, receiverId: string) {
  const bytes = Buffer.from(await file.arrayBuffer());

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
      ? "webp"
      : "jpg";

  const name = `${prefix}_${receiverId}_${Date.now()}_${crypto.randomBytes(8).toString("hex")}.${ext}`;

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const filePath = path.join(UPLOAD_DIR, name);
  await fs.writeFile(filePath, bytes);

  return filePath;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const token = String(form.get("token") ?? "");
    const email = String(form.get("email") ?? "").toLowerCase();
    const password = String(form.get("password") ?? "");
    const identificationNo = String(form.get("identificationNo") ?? "");

    const idFront = form.get("idFront");
    const idBack = form.get("idBack");

    if (!(idFront instanceof File)) {
      return Response.json({ error: "Front ID required" }, { status: 400 });
    }

    const invite = await prisma.receiverInvite.findUnique({
      where: { token },
      include: { receiver: true },
    });

    if (!invite) {
      return Response.json({ error: "Invalid invite" }, { status: 404 });
    }

    if (invite.receiver.identificationNo !== identificationNo) {
      return Response.json({ error: "Identification mismatch" }, { status: 400 });
    }

    const frontUrl = await saveUpload(idFront, "id_front", invite.receiverId);

    let backUrl: string | null = null;
    if (idBack instanceof File) {
      backUrl = await saveUpload(idBack, "id_back", invite.receiverId);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: invite.receiver.fullName,
        phoneNumber: invite.receiver.phone,
        address: invite.receiver.address,
        identificationNo: invite.receiver.identificationNo,
      },
    });

    const verification = await prisma.identityVerificationRequest.create({
      data: {
        receiverId: invite.receiverId,
        requesterUserId: user.id,
        inviteTokenUsed: token,
        identificationNoSubmitted: identificationNo,
        idImageFrontUrl: frontUrl,
        idImageBackUrl: backUrl,
      },
    });

    return Response.json({
      message: "Claim submitted",
      verificationId: verification.id,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}