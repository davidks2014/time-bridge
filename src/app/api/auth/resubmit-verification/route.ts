import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { uploadToB2 } from "@/lib/b2Storage";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return Response.json({ error: "Not logged in." }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true, verificationStatus: true },
    });

    if (!user)
      return Response.json({ error: "User not found." }, { status: 404 });

    if (user.verificationStatus !== "REJECTED")
      return Response.json(
        { error: "Only rejected users can resubmit." },
        { status: 400 }
      );

    const form = await req.formData();
    const idFront = form.get("idFront");
    const idBack = form.get("idBack");

    if (!(idFront instanceof File))
      return Response.json(
        { error: "Front image is required." },
        { status: 400 }
      );

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(idFront.type))
      return Response.json(
        { error: "Only JPG/PNG/WebP allowed." },
        { status: 400 }
      );

    if (idFront.size > 5 * 1024 * 1024)
      return Response.json({ error: "Max 5MB." }, { status: 400 });

    const frontBuf = Buffer.from(await idFront.arrayBuffer());
    const verificationDocFrontUrl = await uploadToB2(
      frontBuf, idFront.name, idFront.type, "documents"
    );

    let verificationDocBackUrl: string | null = null;
    if (idBack instanceof File && idBack.size > 0) {
      const backBuf = Buffer.from(await idBack.arrayBuffer());
      verificationDocBackUrl = await uploadToB2(
        backBuf, idBack.name, idBack.type, "documents"
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationDocFrontUrl,
        verificationDocBackUrl,
        verificationStatus: "PENDING",
        rejectReason: null,
        verifiedAt: null,
      },
    });

    return Response.json({
      message: "Documents resubmitted. Awaiting admin approval.",
    });
  } catch (err: any) {
    console.error("Resubmit error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
