/**
 * src/lib/invites.ts
 *
 * Purpose:
 * - Central place for invitation-token creation logic
 * - Ensures idempotency:
 *   - If there is an existing unused invite -> reuse it
 *   - If existing invite is expired -> create a new one
 *
 * Later:
 * - Replace console.log with real Email/SMS/Post delivery services
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendReceiverInviteEmail, sendAdminBounceAlertEmail } from "@/lib/email";

const INVITE_EXPIRE_DAYS = 14;

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex"); // 64 chars
}

/**
 * Create or reuse an invitation token for a receiver
 * Only for receivers who are NOT linked to a User yet.
 */
export async function createOrReuseReceiverInvite(receiverId: string) {
  // 1) Load receiver (we need contact details + linkedUserId check)
  const receiver = await prisma.receiver.findUnique({
    where: { id: receiverId },
    select: {
      id: true,
      linkedUserId: true,
      fullName: true,
      email: true,
      phone: true,
      address: true,
      identificationNo: true,
    },
  });

  if (!receiver) {
    throw new Error("Receiver not found.");
  }

  // 2) If receiver already linked to a user account -> no invite needed
  if (receiver.linkedUserId) {
    return { receiver, invite: null };
  }

  // 3) If an unused invite exists -> reuse it (idempotency)
  const existing = await prisma.receiverInvite.findFirst({
    where: {
      receiverId: receiver.id,
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  // Helper to check expiry (we store "createdAt" + expiry days for MVP)
  function isExpired(createdAt: Date) {
    const expiresAt = new Date(createdAt);
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRE_DAYS);
    return expiresAt.getTime() < now.getTime();
  }

  if (existing && !isExpired(existing.createdAt)) {
    // ✅ Reuse existing token
    return { receiver, invite: existing };
  }

  // 4) Create a new invite
  const token = generateToken();

  const invite = await prisma.receiverInvite.create({
    data: {
      token,
      receiverId: receiver.id,
      receiverEmail: receiver.email, // keep snapshot of email used
      receiverName: receiver.fullName,
    },
  });

  return { receiver, invite };
}

/**
 * sendInviteDelivery
 *
 * Sends the release notification email to a receiver.
 * Called by the release engine after a memory is released.
 *
 * If the email fails to deliver, an alert is automatically
 * sent to the admin email so they can follow up manually.
 *
 * Parameters:
 * - receiver: the receiver's contact details
 * - senderName: the sender's full name to personalise the email
 * - token: the unique invite token for the claim link
 * - collectionTitle: optional — the title of the memory collection
 * - memoryCount: optional — how many memory items are in this release
 * - memoryId: optional — the collection ID for admin reference
 */
export async function sendInviteDelivery(
  receiver: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    identificationNo?: string;
  },
  senderName: string,
  token: string,
  collectionTitle?: string,
  memoryCount?: number,
  memoryId?: string
): Promise<void> {
  // 1) Attempt to send the release notification email to the receiver
  const result = await sendReceiverInviteEmail({
    receiverName: receiver.fullName,
    receiverEmail: receiver.email,
    senderName,
    inviteToken: token,
    collectionTitle,
    memoryCount,
  });

  // 2) If delivery failed, alert the admin immediately
  // so they can follow up via SMS, guardian, or physical visit
  if (!result.success) {
    console.error(
      "[invites] Email delivery failed for receiver:",
      receiver.email,
      result.error
    );

    // Get admin email from environment variable
    // Falls back to a default if not set — should always be set in production
    const adminEmail = process.env.ADMIN_EMAIL;

    if (adminEmail) {
      // Send bounce alert to admin with all details needed for follow-up
      await sendAdminBounceAlertEmail({
        adminEmail,
        receiverName: receiver.fullName,
        receiverEmail: receiver.email,
        // Use NRIC if available, otherwise show placeholder
        receiverNric: receiver.identificationNo ?? "not recorded",
        memoryId: memoryId ?? "unknown",
      });

      console.log("[invites] Bounce alert sent to admin:", adminEmail);
    } else {
      // Log a warning if ADMIN_EMAIL is not configured
      console.warn(
        "[invites] ADMIN_EMAIL not set — bounce alert not sent.",
        "Please add ADMIN_EMAIL to your environment variables."
      );
    }
  }
}