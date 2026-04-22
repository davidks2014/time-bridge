/**
 * src/app/api/claim/search/route.ts
 *
 * POST — search for released memories by NRIC
 *
 * Purpose:
 * - Receiver enters their NRIC to find memories waiting for them
 * - Returns a list of released memories WITHOUT revealing content
 * - Only shows sender name, collection title, and release date
 * - Used by the self-claim page at /claim
 *
 * Security:
 * - Rate limited to 3 attempts per 10 minutes
 * - Never reveals memory content — only existence
 * - NRIC is normalised before comparison
 */

import { prisma } from "@/lib/prisma";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Get IP address for rate limiting
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const action = "claim-search";

    // Check rate limit before processing
    const rateLimit = await checkRateLimit(ipAddress, action);

    if (!rateLimit.allowed) {
      return Response.json(
        {
          error: `Too many failed attempts. Please try again in ${rateLimit.minutesUntilReset} minute${rateLimit.minutesUntilReset !== 1 ? "s" : ""}.`,
          rateLimited: true,
          minutesUntilReset: rateLimit.minutesUntilReset,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const identificationNo = String(body.identificationNo ?? "")
      .trim()
      .toUpperCase()
      .replace(/\s/g, "");

    if (!identificationNo || identificationNo.length < 6) {
      return Response.json(
        { error: "A valid identification number is required." },
        { status: 400 }
      );
    }

    // Search for matching receivers
    const receivers = await prisma.receiver.findMany({
      where: {
        identificationNo: { equals: identificationNo, mode: "insensitive" },
        linkedUserId: null,
        collections: {
          some: { items: { some: { status: "RELEASED" } } },
        },
      },
      select: {
        id: true,
        fullName: true,
        identificationNo: true,
        invites: {
          where: { usedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { token: true },
        },
        collections: {
          where: { items: { some: { status: "RELEASED" } } },
          select: {
            id: true,
            title: true,
            owner: { select: { name: true } },
            items: {
              where: { status: "RELEASED" },
              orderBy: { releasedAt: "desc" },
              take: 1,
              select: { releasedAt: true },
            },
          },
        },
      },
    });

    if (receivers.length === 0) {
      // No match found — record failed attempt
      await recordFailedAttempt(ipAddress, action);

      // Re-check to get updated remaining count
      const updatedRateLimit = await checkRateLimit(ipAddress, action);

      return Response.json({
        memories: [],
        attemptsRemaining: updatedRateLimit.attemptsRemaining,
        warning: updatedRateLimit.attemptsRemaining <= 1
          ? `Warning: ${updatedRateLimit.attemptsRemaining} attempt${updatedRateLimit.attemptsRemaining !== 1 ? "s" : ""} remaining before temporary lockout.`
          : null,
      });
    }

    // Match found — reset rate limit counter
    await resetRateLimit(ipAddress, action);

    const memories = receivers.flatMap((receiver) =>
      receiver.collections.map((collection) => ({
        collectionId: collection.id,
        collectionTitle: collection.title,
        senderName: collection.owner?.name ?? "Someone",
        receiverName: receiver.fullName,
        receiverId: receiver.id,
        inviteToken: receiver.invites[0]?.token ?? null,
        releasedAt: collection.items[0]?.releasedAt ?? new Date(),
      }))
    );

    return Response.json({ memories });

  } catch (err) {
    console.error("POST /api/claim/search error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
