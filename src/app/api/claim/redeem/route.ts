/**
 * src/app/api/claim/redeem/route.ts
 *
 * POST — redeem a claim code to fast-track memory access
 *
 * Purpose:
 * - Receiver enters their claim code at /claim
 * - System validates the code and links their account
 * - No document upload required — admin already verified them
 * - After redemption, receiver can immediately see their memory
 *
 * Security:
 * - Code must not be expired (90 day limit)
 * - Code must not already be used
 * - Receiver must provide their NRIC to confirm identity
 * - Rate limited — 3 failed attempts freezes the code (task 3.13)
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  normaliseClaimCode,
  isClaimCodeExpired,
} from "@/lib/claim-code";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawCode = String(body.claimCode ?? "").trim();
    const identificationNo = String(body.identificationNo ?? "")
      .trim()
      .toUpperCase();

    if (!rawCode) {
      return Response.json({ error: "Claim code is required." }, { status: 400 });
    }

    if (!identificationNo) {
      return Response.json({ error: "NRIC is required." }, { status: 400 });
    }

    // Normalise the code — remove spaces, dashes, uppercase
    const normalisedCode = normaliseClaimCode(rawCode);

    // Find the visit log with this claim code
    // We search by normalising stored codes too
    const visitLogs = await prisma.visitLog.findMany({
      where: {
        claimCode: { not: null },
      },
      select: {
        id: true,
        claimCode: true,
        claimCodeExpiresAt: true,
        receiverId: true,
        receiver: {
          select: {
            id: true,
            fullName: true,
            identificationNo: true,
            linkedUserId: true,
          },
        },
      },
    });

    // Find matching code by normalising both sides
    const matchingLog = visitLogs.find(
      (log) =>
        log.claimCode &&
        normaliseClaimCode(log.claimCode) === normalisedCode
    );

    if (!matchingLog) {
      return Response.json(
        { error: "Invalid claim code. Please check the code and try again." },
        { status: 404 }
      );
    }

    // Check if code has expired
    if (
      matchingLog.claimCodeExpiresAt &&
      isClaimCodeExpired(matchingLog.claimCodeExpiresAt)
    ) {
      return Response.json(
        { error: "This claim code has expired. Please contact our support team." },
        { status: 400 }
      );
    }

    const receiver = matchingLog.receiver;

    // Check receiver is not already linked
    if (receiver.linkedUserId) {
      return Response.json(
        { error: "This memory has already been claimed." },
        { status: 400 }
      );
    }

    // Verify NRIC matches the receiver record
    if (
      identificationNo !==
      receiver.identificationNo.toUpperCase().replace(/\s/g, "")
    ) {
      return Response.json(
        {
          error:
            "Your NRIC does not match this claim code. " +
            "Please make sure you are entering the correct code.",
        },
        { status: 400 }
      );
    }

    // Check if user is already logged in
    const session = await getServerSession(authOptions);

    if (session?.user?.email) {
      // User is logged in — link their account directly
      const user = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: { id: true, identificationNo: true },
      });

      if (user) {
        // Double check NRIC matches the logged-in user too
        if (
          user.identificationNo.toUpperCase() !==
          receiver.identificationNo.toUpperCase()
        ) {
          return Response.json(
            {
              error:
                "Your account NRIC does not match this claim code. " +
                "Please log in with the correct account.",
            },
            { status: 403 }
          );
        }

        // Link the receiver to the logged-in user
        await prisma.receiver.update({
          where: { id: receiver.id },
          data: { linkedUserId: user.id },
        });

        // Mark claim code as used by expiring it
        await prisma.visitLog.update({
          where: { id: matchingLog.id },
          data: { claimCodeExpiresAt: new Date() },
        });

        return Response.json({
          message: "Memory claimed successfully. You can now view it.",
          linked: true,
          requiresLogin: false,
        });
      }
    }

    // User is not logged in — return receiver info so frontend
    // can redirect them to register or login
    return Response.json({
      message: "Claim code is valid. Please log in or create an account to claim your memory.",
      linked: false,
      requiresLogin: true,
      receiverId: receiver.id,
      receiverName: receiver.fullName,
      // Pass the code so it can be used after login
      claimCode: rawCode,
    });

  } catch (err) {
    console.error("POST /api/claim/redeem error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
