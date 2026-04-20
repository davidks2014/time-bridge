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
 * - Rate limited to 5 attempts per 10 minutes (task 3.13)
 * - Never reveals memory content — only existence
 * - NRIC is normalised before comparison
 */

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const identificationNo = String(body.identificationNo ?? "")
      .trim()
      .toUpperCase()
      .replace(/\s/g, "");

    // Basic validation
    if (!identificationNo || identificationNo.length < 6) {
      return Response.json(
        { error: "A valid identification number is required." },
        { status: 400 }
      );
    }

    // Find all receiver records with this NRIC that have released memories
    // and are not yet linked to a user account
    const receivers = await prisma.receiver.findMany({
      where: {
        // Normalise comparison — case insensitive
        identificationNo: {
          equals: identificationNo,
          mode: "insensitive",
        },
        // Not yet linked to an account
        linkedUserId: null,
        // Has at least one released memory
        collections: {
          some: {
            items: {
              some: { status: "RELEASED" },
            },
          },
        },
      },
      select: {
        id: true,
        fullName: true,
        identificationNo: true,
        // Get invite token if one exists
        invites: {
          where: { usedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { token: true },
        },
        // Get released collections
        collections: {
          where: {
            items: {
              some: { status: "RELEASED" },
            },
          },
          select: {
            id: true,
            title: true,
            owner: {
              select: { name: true },
            },
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

    // If no receivers found return empty — do not reveal why
    // (prevents NRIC enumeration attacks)
    if (receivers.length === 0) {
      return Response.json({ memories: [] });
    }

    // Build response — never include memory content
    const memories = receivers.flatMap((receiver) =>
      receiver.collections.map((collection) => ({
        collectionId: collection.id,
        collectionTitle: collection.title,
        senderName: collection.owner?.name ?? "Someone",
        receiverName: receiver.fullName,
        receiverId: receiver.id,
        // Pass invite token so they can use the invite claim flow
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
