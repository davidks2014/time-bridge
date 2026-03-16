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
 * For MVP delivery simulation:
 * - Later you will integrate Email/SMS/Post providers
 */
export function logInviteDelivery(receiver: {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}, token: string) {
  const inviteLink = `http://localhost:3000/receiver/invite/${token}`;

  console.log("========================================");
  console.log("INVITE DELIVERY (MVP SIMULATION)");
  console.log("Receiver Name   :", receiver.fullName);
  console.log("Receiver Email  :", receiver.email);
  console.log("Receiver Phone  :", receiver.phone);
  console.log("Receiver Address:", receiver.address);
  console.log("Invite Link     :", inviteLink);
  console.log("========================================");
}