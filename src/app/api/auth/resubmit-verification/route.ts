import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { uploadToB2 } from "@/lib/b2Storage";

/**
 * API: POST /api/auth/resubmit-verification
 *
 * Purpose:
 * - Rejected user can upload new verification documents
 * - System resets status back to PENDING
 * - Clears rejectReason
 *
 * Request type:
 * - multipart/form-data
 *
 * Form fields:
 * - idFront (required)
 * - idBack (optional)
 */
export async function POST(req: Request) {
  try {
    // 1) Must be logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    // 2) Find current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: {
        id: true,
        verificationStatus: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // Optional rule: only rejected users can use this
    if (user.verificationStatus !== "REJECTED") {
      return Response.json(
        { error: "Only rejected users can resubmit verification." },
        { status: 400 }
      );
    }

    const form = await req.formData();

    const idFront = form.get("idFront");
    const idBack = form.get("idBack");

    if (!(idFront instanceof File)) {
      return Response.json(
        { error: "Verification image (front) is required." },
        { status: 400 }
      );
    }

    async function saveUpload(file: File): Promise<string> {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        throw new Error("Only JPG/PNG/WebP images are allowed.");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File too large. Max 5MB.");
      }
      const buf = Buffer.from(await file.arrayBuffer());
      return uploadToB2(buf, file.name, file.type, "documents");
    }

    const verificationDocFrontUrl = await saveUpload(idFront);

    let verificationDocBackUrl: string | null = null;
    if (idBack instanceof File && idBack.size > 0) {
      verificationDocBackUrl = await saveUpload(idBack);
    }

    // 3) Update user back to pending
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationDocFrontUrl,
        verificationDocBackUrl: verificationDocBackUrl ?? null,
        verificationStatus: "PENDING",
        rejectReason: null,
        verifiedAt: null,
      },
      select: {
        id: true,
        email: true,
        verificationStatus: true,
        rejectReason: true,
      },
    });

    return Response.json({
      message: "Verification documents resubmitted successfully. Awaiting admin approval.",
      user: updated,
    });
  } catch (err: any) {
    console.error("Resubmit verification error:", err);

    const msg = String(err?.message ?? "");
    if (msg.includes("allowed") || msg.includes("Max 5MB")) {
      return Response.json({ error: msg }, { status: 400 });
    }

    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
