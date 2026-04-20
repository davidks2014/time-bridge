/**
 * src/lib/device-fingerprint.ts
 *
 * Purpose:
 * - Generate a privacy-safe device fingerprint from request headers
 * - Store and compare fingerprints to detect new device logins
 * - Alert admin when a new device logs in during WARNING/CRITICAL stage
 *
 * Privacy design:
 * - We never store raw IP addresses
 * - We hash the fingerprint so the original data cannot be recovered
 * - We only store the first 3 octets of the IP (e.g. 123.45.67.xxx)
 *   to detect rough location changes without tracking exact location
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getResendClient, FROM_ADDRESS, getAppUrl } from "@/lib/email";

// ─── Generate fingerprint hash ────────────────────────────────────────────────

/**
 * Creates a privacy-safe fingerprint hash from request headers.
 * The same device and browser will produce the same hash.
 * Different devices or browsers will produce different hashes.
 */
export function generateFingerprintHash(
  userAgent: string,
  ipAddress: string
): string {
  // Use only the first 3 octets of IPv4 for rough location
  // e.g. "123.45.67.89" becomes "123.45.67"
  const roughIp = ipAddress.split(".").slice(0, 3).join(".");

  const raw = `${userAgent}|${roughIp}`;

  // Hash it — we never store the raw value
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Extracts a human-readable device label from user agent string
 * e.g. "Chrome on Mac", "Safari on iPhone"
 */
export function getDeviceLabel(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  let browser = "Unknown browser";
  if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("edg")) browser = "Edge";

  let device = "Unknown device";
  if (ua.includes("iphone")) device = "iPhone";
  else if (ua.includes("ipad")) device = "iPad";
  else if (ua.includes("android")) device = "Android";
  else if (ua.includes("mac")) device = "Mac";
  else if (ua.includes("windows")) device = "Windows";
  else if (ua.includes("linux")) device = "Linux";

  return `${browser} on ${device}`;
}

// ─── Check and record device fingerprint ─────────────────────────────────────

type CheckFingerprintParams = {
  userId: string;
  userName: string;
  userEmail: string;
  proofOfLifeStage: string;
  fingerprintHash: string;
  deviceLabel: string;
};

/**
 * Checks if this device has been seen before for this user.
 * If it is a new device and the user is in WARNING/CRITICAL stage,
 * flags it and alerts the admin.
 *
 * Always records the fingerprint (create or update lastSeenAt).
 */
export async function checkAndRecordFingerprint(
  params: CheckFingerprintParams
): Promise<{ isNewDevice: boolean; flagged: boolean }> {
  const {
    userId,
    userName,
    userEmail,
    proofOfLifeStage,
    fingerprintHash,
    deviceLabel,
  } = params;

  const existing = await prisma.deviceFingerprint.findUnique({
    where: {
      userId_fingerprintHash: {
        userId,
        fingerprintHash,
      },
    },
  });

  const isNewDevice = !existing;

  // Flag when new device + user is in WARNING or CRITICAL stage
  const shouldFlag =
    isNewDevice &&
    (proofOfLifeStage === "WARNING" || proofOfLifeStage === "CRITICAL");

  await prisma.deviceFingerprint.upsert({
    where: {
      userId_fingerprintHash: {
        userId,
        fingerprintHash,
      },
    },
    create: {
      userId,
      fingerprintHash,
      deviceLabel,
      flagged: shouldFlag,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    },
    update: {
      lastSeenAt: new Date(),
    },
  });

  if (shouldFlag) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendAdminNewDeviceAlertEmail({
        adminEmail,
        userName,
        userEmail,
        deviceLabel,
        proofOfLifeStage,
      }).catch((err) =>
        console.error("[fingerprint] Admin alert email failed:", err)
      );
    }
  }

  return { isNewDevice, flagged: shouldFlag };
}

// ─── Admin alert email for new device ────────────────────────────────────────

type SendAdminNewDeviceAlertEmailParams = {
  adminEmail: string;
  userName: string;
  userEmail: string;
  deviceLabel: string;
  proofOfLifeStage: string;
};

async function sendAdminNewDeviceAlertEmail(
  params: SendAdminNewDeviceAlertEmailParams
): Promise<void> {
  const { adminEmail, userName, userEmail, deviceLabel, proofOfLifeStage } = params;

  const adminUrl = `${getAppUrl()}/admin/verification`;

  await getResendClient().emails.send({
    from: FROM_ADDRESS,
    to: adminEmail,
    subject: `Time Bridge — suspicious login detected for ${userName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">

        <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h2 style="font-size: 22px; font-weight: 500; margin: 0 0 8px 0; color: #92400e;">
            New device login during ${proofOfLifeStage.toLowerCase()} stage
          </h2>
          <p style="margin: 0; color: #b45309; font-size: 14px;">
            Time Bridge — Admin Security Alert
          </p>
        </div>

        <p style="color: #555; line-height: 1.7;">
          A user who is currently in the <strong>${proofOfLifeStage}</strong> proof-of-life
          stage has logged in from a device that has never been seen before.
        </p>

        <div style="
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin: 24px 0;
        ">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #374151;">
            <strong>User:</strong> ${userName} (${userEmail})
          </p>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #374151;">
            <strong>Device:</strong> ${deviceLabel}
          </p>
          <p style="margin: 0; font-size: 13px; color: #374151;">
            <strong>Stage:</strong> ${proofOfLifeStage}
          </p>
        </div>

        <p style="color: #555; line-height: 1.7;">
          This may indicate the sender is alive and using a new device,
          or it may indicate unauthorised access to their account.
          Please investigate before any memories are released.
        </p>

        <div style="margin: 32px 0; text-align: center;">
          <a
            href="${adminUrl}"
            style="
              background-color: #d97706;
              color: white;
              padding: 16px 36px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 500;
              font-size: 16px;
              display: inline-block;
            "
          >
            Go to admin panel
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

        <p style="color: #aaa; font-size: 12px;">
          Time Bridge — automated security alert.<br/>
          This was triggered because a new device logged in during an unresponsive period.
        </p>

      </div>
    `,
  });
}
