/**
 * src/app/api/jobs/run-proof-check/route.ts
 *
 * Purpose:
 * - Runs daily via Vercel cron
 * - Implements 3-stage proof-of-life escalation:
 *
 * Stage 1 — NORMAL:
 *   Sender is within their confirmation window. No action.
 *
 * Stage 2 — WARNING:
 *   Sender is within 5 days of their deadline.
 *   Send a gentle reminder email.
 *   Update proofOfLifeStage to WARNING.
 *
 * Stage 3 — CRITICAL:
 *   Sender has missed their confirmation deadline.
 *   Send urgent email to sender.
 *   Send alert email to trusted contact (if set).
 *   Increment missedConfirmations.
 *   Update proofOfLifeStage to CRITICAL.
 *
 * Reset:
 *   When sender clicks "I'm Alive", reset to NORMAL,
 *   clear missedConfirmations, update lastConfirmedAt.
 *
 * Holiday snooze:
 *   If snoozedUntil is set and in the future, skip this user entirely.
 *
 * Auth:
 *   Bearer CRON_SECRET for manual testing
 *   x-vercel-cron header for Vercel automatic runs
 */

import { prisma } from "@/lib/prisma";
import {
  sendProofOfLifeReminderEmail,
  sendTrustedContactAlertEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";

// ─── Auth check ───────────────────────────────────────────────────────────────

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization")?.trim();
  const vercelCronHeader = req.headers.get("x-vercel-cron");

  return (
    authHeader === `Bearer ${secret}` ||
    vercelCronHeader === "1"
  );
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    // 1) Auth check
    if (!process.env.CRON_SECRET) {
      return Response.json({ error: "CRON_SECRET not configured." }, { status: 500 });
    }

    if (!isAuthorized(req)) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const now = new Date();

    // 2) Load all active users with their proof-of-life data
    // Skip admin accounts — they do not need proof-of-life checks
    const users = await prisma.user.findMany({
      where: {
        role: "USER",
        // Only check users who have at least one memory
        collections: { some: {} },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        lastConfirmedAt: true,
        confirmationIntervalDays: true,
        missedConfirmations: true,
        proofOfLifeStage: true,
        snoozedUntil: true,
        trustedContactName: true,
        trustedContactEmail: true,
      },
    });

    // Track results for the response summary
    let skippedSnoozed = 0;
    let sentWarnings = 0;
    let sentCritical = 0;
    let sentTrustedContactAlerts = 0;
    let alreadyNormal = 0;

    // 3) Process each user
    for (const user of users) {
      // ── Skip if holiday snooze is active ────────────────────────────────────
      if (user.snoozedUntil && new Date(user.snoozedUntil) > now) {
        skippedSnoozed += 1;
        continue;
      }

      const intervalDays = user.confirmationIntervalDays || 30;

      // Use last confirmed time or account creation as the anchor
      const anchor = user.lastConfirmedAt ?? user.createdAt;

      // Calculate when the next confirmation is due
      const nextDue = new Date(anchor);
      nextDue.setDate(nextDue.getDate() + intervalDays);

      // Calculate days remaining until deadline
      const msRemaining = nextDue.getTime() - now.getTime();
      const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));

      // ── Stage 1 — NORMAL ─────────────────────────────────────────────────────
      // Sender is well within their window — nothing to do
      if (daysRemaining > 5) {
        // Reset to NORMAL if they were previously in WARNING or CRITICAL
        // and have since confirmed (missedConfirmations would be 0)
        if (user.proofOfLifeStage !== "NORMAL" && user.missedConfirmations === 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: { proofOfLifeStage: "NORMAL" },
          });
        }
        alreadyNormal += 1;
        continue;
      }

      // ── Stage 2 — WARNING ─────────────────────────────────────────────────────
      // Sender is within 5 days of their deadline
      // Only send if they are not already in CRITICAL stage
      if (daysRemaining >= 0 && daysRemaining <= 5) {
        // Only send warning email if not already in WARNING or CRITICAL
        if (user.proofOfLifeStage === "NORMAL") {
          // Send gentle reminder email to sender
          await sendProofOfLifeReminderEmail({
            userName: user.name,
            userEmail: user.email,
            daysRemaining,
            confirmationIntervalDays: intervalDays,
          }).catch((err) =>
            console.error(`[proof-check] Warning email failed for ${user.email}:`, err)
          );

          // Update stage to WARNING
          await prisma.user.update({
            where: { id: user.id },
            data: { proofOfLifeStage: "WARNING" },
          });

          sentWarnings += 1;
        }
        continue;
      }

      // ── Stage 3 — CRITICAL ────────────────────────────────────────────────────
      // Sender has missed their deadline (daysRemaining < 0)
      // Bump missed confirmations, send urgent emails

      // Calculate the bumped anchor so we do not count the same
      // missed cycle again on the next cron run
      const bumpedAnchor = new Date(anchor);
      bumpedAnchor.setDate(bumpedAnchor.getDate() + intervalDays);

      const newMissedCount = user.missedConfirmations + 1;

      // Update user — increment missed count, bump anchor, set stage
      await prisma.user.update({
        where: { id: user.id },
        data: {
          missedConfirmations: newMissedCount,
          lastConfirmedAt: bumpedAnchor,
          proofOfLifeStage: "CRITICAL",
        },
      });

      // Send urgent reminder email to the sender
      await sendProofOfLifeReminderEmail({
        userName: user.name,
        userEmail: user.email,
        daysRemaining: Math.abs(daysRemaining), // days overdue
        confirmationIntervalDays: intervalDays,
        isOverdue: true,
        missedCount: newMissedCount,
      }).catch((err) =>
        console.error(`[proof-check] Critical email failed for ${user.email}:`, err)
      );

      sentCritical += 1;

      // Alert the trusted contact if one is set
      if (user.trustedContactEmail && user.trustedContactName) {
        // Use "warning" stage for first miss, "critical" for subsequent misses
        const alertStage = newMissedCount === 1 ? "warning" : "critical";

        await sendTrustedContactAlertEmail({
          trustedContactName: user.trustedContactName,
          trustedContactEmail: user.trustedContactEmail,
          senderName: user.name,
          stage: alertStage,
        }).catch((err) =>
          console.error(`[proof-check] Trusted contact alert failed for ${user.email}:`, err)
        );

        sentTrustedContactAlerts += 1;
      }
    }

    // 4) Return summary
    return Response.json({
      message: "Proof-of-life check completed.",
      totalUsersChecked: users.length,
      skippedSnoozed,
      alreadyNormal,
      sentWarnings,
      sentCritical,
      sentTrustedContactAlerts,
      ranAt: now.toISOString(),
    });

  } catch (err) {
    console.error("run-proof-check error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}

/**
 * GET handler for Vercel Cron
 * Vercel cron sends GET requests — this forwards to the POST logic
 */
export async function GET(req: Request) {
  return POST(req);
}
