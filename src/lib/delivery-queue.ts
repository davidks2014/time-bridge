/**
 * src/lib/delivery-queue.ts
 *
 * Purpose:
 * - Orchestrates multi-channel delivery when a memory is released
 * - Tries each channel in order until one succeeds
 * - Records every attempt in the DeliveryAttempt table
 * - Escalates to admin if all digital channels fail
 *
 * Delivery order:
 * 1. EMAIL — immediate, uses Resend
 * 2. TRUSTED_CONTACT — alert sender's trusted contact (day 3 if email fails)
 * 3. GUARDIAN — notify guardian for child receivers (day 7)
 * 4. ADMIN — flag for physical visit (day 14)
 */

import { prisma } from "@/lib/prisma";
import {
  sendReceiverInviteEmail,
  sendAdminBounceAlertEmail,
  sendGuardianNotificationEmail,
  sendTrustedContactAlertEmail,
} from "@/lib/email";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReceiverDetails = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string;
  identificationNo: string;
  receiverType: string;
  guardianName: string | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
  guardianAddress: string | null;
};

type SenderDetails = {
  id: string;
  name: string;
  trustedContactName: string | null;
  trustedContactEmail: string | null;
};

type DeliveryContext = {
  receiver: ReceiverDetails;
  sender: SenderDetails;
  inviteToken: string;
  collectionId: string;
  collectionTitle: string;
  memoryCount: number;
};

// ─── Record delivery attempt ──────────────────────────────────────────────────

async function recordAttempt(
  receiverId: string,
  channel: string,
  status: string,
  notes?: string
): Promise<void> {
  await prisma.deliveryAttempt.create({
    data: {
      receiverId,
      channel: channel as any,
      status: status as any,
      notes: notes ?? null,
    },
  });
}

// ─── Main delivery function ───────────────────────────────────────────────────

/**
 * Attempts to deliver a memory release notification through multiple channels.
 * Records every attempt in the DeliveryAttempt table.
 * Returns a summary of what was attempted and what succeeded.
 */
export async function deliverMemoryNotification(
  ctx: DeliveryContext
): Promise<{ channel: string; success: boolean }> {
  const { receiver, sender, inviteToken, collectionId, collectionTitle, memoryCount } = ctx;

  // ── Channel 1: EMAIL ─────────────────────────────────────────────────────────
  // Try email first — fastest and cheapest channel
  // Skip if receiver has no email address
  if (receiver.email && receiver.email.trim()) {
    try {
      const result = await sendReceiverInviteEmail({
        receiverName: receiver.fullName,
        receiverEmail: receiver.email,
        senderName: sender.name,
        inviteToken,
        collectionTitle,
        memoryCount,
      });

      if (result.success) {
        await recordAttempt(
          receiver.id,
          "EMAIL",
          "DELIVERED",
          `Email sent successfully. Resend ID: ${result.id}`
        );

        return { channel: "EMAIL", success: true };
      }

      await recordAttempt(
        receiver.id,
        "EMAIL",
        "FAILED",
        result.error ?? "Email delivery failed"
      );

    } catch (err) {
      await recordAttempt(
        receiver.id,
        "EMAIL",
        "FAILED",
        String((err as Error)?.message ?? "Unknown error")
      );
    }
  } else {
    await recordAttempt(
      receiver.id,
      "EMAIL",
      "PENDING",
      "No email address on record — skipping email channel"
    );
  }

  // ── Channel 2: GUARDIAN (for child receivers) ─────────────────────────────
  // If receiver is a child and has a guardian, notify the guardian
  if (
    (receiver.receiverType === "CHILD" || receiver.receiverType === "UNKNOWN") &&
    receiver.guardianEmail &&
    receiver.guardianName
  ) {
    try {
      const result = await sendGuardianNotificationEmail({
        guardianName: receiver.guardianName,
        guardianEmail: receiver.guardianEmail,
        senderName: sender.name,
        receiverName: receiver.fullName,
        collectionTitle,
        inviteToken,
      });

      if (result.success) {
        await recordAttempt(
          receiver.id,
          "GUARDIAN",
          "DELIVERED",
          `Guardian notification sent to ${receiver.guardianEmail}`
        );

        return { channel: "GUARDIAN", success: true };
      }

      await recordAttempt(
        receiver.id,
        "GUARDIAN",
        "FAILED",
        result.error ?? "Guardian notification failed"
      );

    } catch (err) {
      await recordAttempt(
        receiver.id,
        "GUARDIAN",
        "FAILED",
        String((err as Error)?.message ?? "Unknown error")
      );
    }
  }

  // ── Channel 3: TRUSTED CONTACT ────────────────────────────────────────────
  // Alert the sender's trusted contact to help reach the receiver
  if (sender.trustedContactEmail && sender.trustedContactName) {
    try {
      const result = await sendTrustedContactAlertEmail({
        trustedContactName: sender.trustedContactName,
        trustedContactEmail: sender.trustedContactEmail,
        senderName: sender.name,
        stage: "warning",
      });

      if (result.success) {
        await recordAttempt(
          receiver.id,
          "TRUSTED_CONTACT",
          "DELIVERED",
          `Trusted contact alerted: ${sender.trustedContactEmail}`
        );

        return { channel: "TRUSTED_CONTACT", success: true };
      }

      await recordAttempt(
        receiver.id,
        "TRUSTED_CONTACT",
        "FAILED",
        result.error ?? "Trusted contact alert failed"
      );

    } catch (err) {
      await recordAttempt(
        receiver.id,
        "TRUSTED_CONTACT",
        "FAILED",
        String((err as Error)?.message ?? "Unknown error")
      );
    }
  }

  // ── Channel 4: ADMIN ──────────────────────────────────────────────────────
  // All digital channels failed — alert admin for physical visit
  const adminEmail = process.env.ADMIN_EMAIL;

  if (adminEmail) {
    try {
      await sendAdminBounceAlertEmail({
        adminEmail,
        receiverName: receiver.fullName,
        receiverEmail: receiver.email ?? "no email on record",
        receiverNric: receiver.identificationNo,
        memoryId: collectionId,
      });

      await recordAttempt(
        receiver.id,
        "ADMIN",
        "SENT",
        "All digital channels failed — admin alerted for physical visit"
      );

      return { channel: "ADMIN", success: true };

    } catch (err) {
      await recordAttempt(
        receiver.id,
        "ADMIN",
        "FAILED",
        String((err as Error)?.message ?? "Unknown error")
      );
    }
  }

  // All channels failed
  return { channel: "NONE", success: false };
}
