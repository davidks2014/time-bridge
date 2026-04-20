/**
 * src/lib/nric-match.ts
 *
 * Purpose:
 * - Auto-match a user's NRIC against receiver records
 * - Called when a user completes their profile
 * - If a match is found with released memories, create a
 *   pending verification request automatically
 *
 * This allows receivers to claim memories without needing
 * to receive the invite email — they just register and
 * their NRIC is matched automatically
 */

import { prisma } from "@/lib/prisma";

type NricMatchResult = {
  matchesFound: number;
  receiverIds: string[];
};

/**
 * Searches for unlinked receivers with released memories
 * whose NRIC matches the given user's NRIC.
 *
 * If matches are found, creates IdentityVerificationRequest
 * records so admin can review and approve the link.
 */
export async function autoMatchNric(
  userId: string,
  identificationNo: string
): Promise<NricMatchResult> {

  const normalizedNric = identificationNo.toUpperCase().replace(/\s/g, "");

  // Find unlinked receivers with this NRIC that have released memories
  const matchingReceivers = await prisma.receiver.findMany({
    where: {
      // NRIC matches — case insensitive
      identificationNo: {
        equals: normalizedNric,
        mode: "insensitive",
      },
      // Not yet linked to any user account
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
    },
  });

  if (matchingReceivers.length === 0) {
    return { matchesFound: 0, receiverIds: [] };
  }

  const receiverIds: string[] = [];

  // Create a verification request for each matching receiver
  // Admin will review and approve the link
  for (const receiver of matchingReceivers) {
    // Check if a verification request already exists for this receiver + user
    const existing = await prisma.identityVerificationRequest.findFirst({
      where: {
        receiverId: receiver.id,
        requesterUserId: userId,
      },
    });

    if (existing) continue;

    // Get the user's verification documents to attach to the request
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        verificationDocFrontUrl: true,
        verificationDocBackUrl: true,
      },
    });

    // Create verification request
    // Admin will see this in the verification queue
    await prisma.identityVerificationRequest.create({
      data: {
        receiverId: receiver.id,
        requesterUserId: userId,
        identificationNoSubmitted: normalizedNric,
        // Use the user's uploaded verification documents
        idImageFrontUrl: user?.verificationDocFrontUrl ?? "",
        idImageBackUrl: user?.verificationDocBackUrl ?? null,
      },
    });

    receiverIds.push(receiver.id);

    console.log(
      `[nric-match] Auto-matched user ${userId} to receiver ${receiver.id} (${receiver.fullName})`
    );
  }

  return { matchesFound: receiverIds.length, receiverIds };
}

/**
 * Links a user to a receiver record directly.
 * Called by admin approval route after verifying identity.
 */
export async function linkUserToReceiver(
  userId: string,
  receiverId: string
): Promise<void> {
  await prisma.receiver.update({
    where: { id: receiverId },
    data: { linkedUserId: userId },
  });

  console.log(`[nric-match] Linked user ${userId} to receiver ${receiverId}`);
}
