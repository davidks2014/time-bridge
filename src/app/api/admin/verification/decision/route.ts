/**
 * API: POST /api/admin/verification/decision
 *
 * Body:
 * {
 *   "userId": "xxx",
 *   "decision": "APPROVE" | "REJECT",
 *   "rejectReason": "optional string"
 * }
 *
 * Purpose:
 * - Admin approves or rejects verification
 *
 * Notes:
 * - Uses Prisma enum VerificationStatus from @prisma/client
 * - Prevents TS mismatch like "Type 'VERIFIED' is not assignable ..."
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { VerificationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1) Check session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    // 2) Check admin role (security must be server-side)
    const admin = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true, role: true },
    });

    if (!admin) return Response.json({ error: "User not found." }, { status: 404 });
    if (admin.role !== "ADMIN") {
      return Response.json({ error: "Forbidden. Admin only." }, { status: 403 });
    }

    // 3) Read request body
    const body = await req.json();
    const userId = String(body.userId ?? "").trim();
    const decision = String(body.decision ?? "").trim().toUpperCase();
    const rejectReason = String(body.rejectReason ?? "").trim();

    if (!userId) return Response.json({ error: "userId is required." }, { status: 400 });
    if (decision !== "APPROVE" && decision !== "REJECT") {
      return Response.json({ error: "decision must be APPROVE or REJECT." }, { status: 400 });
    }

    // 4) Pick enum values from Prisma (NO hard-coded strings)
    //    IMPORTANT: These must exist in your schema.prisma enum VerificationStatus.
    //    If your enum names differ, TypeScript will complain here (good).
    const APPROVED_VALUE =
      (VerificationStatus as any).VERIFIED ??
      (VerificationStatus as any).APPROVED ??
      (VerificationStatus as any).ACTIVE;

    const REJECTED_VALUE =
      (VerificationStatus as any).REJECTED ??
      (VerificationStatus as any).DECLINED;

    if (!APPROVED_VALUE || !REJECTED_VALUE) {
      return Response.json(
        {
          error:
            "Your VerificationStatus enum values do not match this API. Please check prisma/schema.prisma enum VerificationStatus.",
        },
        { status: 500 }
      );
    }

    // 5) Apply decision
    if (decision === "APPROVE") {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          verificationStatus: APPROVED_VALUE,
          verifiedAt: new Date(),
          rejectReason: null,
        },
        select: {
          id: true,
          email: true,
          verificationStatus: true,
          verifiedAt: true,
        },
      });

      return Response.json({ message: "User approved.", user: updated });
    }

    // decision === "REJECT"
    if (!rejectReason) {
      return Response.json({ error: "rejectReason is required when rejecting." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: REJECTED_VALUE,
        verifiedAt: null,
        rejectReason,
      },
      select: {
        id: true,
        email: true,
        verificationStatus: true,
        rejectReason: true,
      },
    });

    return Response.json({ message: "User rejected.", user: updated });
  } catch (err) {
    console.error("POST /api/admin/verification/decision error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}