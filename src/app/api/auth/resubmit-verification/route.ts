import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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

    const body = await req.json().catch(() => ({}));
    const frontUrl = String(body.frontUrl ?? "").trim();
    const backUrl  = body.backUrl ? String(body.backUrl).trim() : null;

    if (!frontUrl)
      return Response.json({ error: "Front image URL is required." }, { status: 400 });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationDocFrontUrl: frontUrl,
        verificationDocBackUrl: backUrl,
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
