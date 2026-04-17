/**
 * src/app/api/jobs/run-proof-check/route.ts
 *
 * Purpose:
 * - Runs daily via Vercel cron (see vercel.json)
 * - Checks every sender's proof-of-life status
 * - Sends reminder emails based on how many days have passed
 *   since their last confirmation
 *
 * Reminder schedule (based on confirmationIntervalDays, default 30):
 * - Day 25 → gentle reminder email
 * - Day 29 → urgent warning email
 * - Day 30+ → missed confirmation counted, clock bumped forward
 *
 * Auth:
 * - Bearer CRON_SECRET for manual testing via Thunder Client
 * - x-vercel-cron header for Vercel cron automatic runs
 */

import { prisma } from "@/lib/prisma";
import {
  sendProofOfLifeReminderEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";

// ─── Auth check ───────────────────────────────────────────────────────────────
// Accepts both manual Bearer token and Vercel cron header

function isAuthorized(req: Request) {
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
    // 1) Check CRON_SECRET is configured
    if (!process.env.CRON_SECRET) {
      return Response.json(
        { error: "CRON_SECRET is not configured." },
        { status: 500 }
      );
    }

    // 2) Reject unauthorized requests
    if (!isAuthorized(req)) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const now = new Date();

    // 3) Load all users with their proof-of-life fields and email
    // We need email and name to send reminder emails
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        lastConfirmedAt: true,
        confirmationIntervalDays: true,
        missedConfirmations: true,
      },
    });

    // 4) Track results for the response summary
    let gentleRemindersSent = 0;
    let urgentRemindersSent = 0;
    let missedConfirmationsUpdated = 0;

    // 5) Loop through every user and decide what action to take
    for (const user of users) {
      // Use 30 days as default if not set
      const intervalDays = user.confirmationIntervalDays || 30;

      // Use account creation date as the starting anchor if never confirmed
      const anchor = user.lastConfirmedAt ?? user.createdAt;

      // Calculate how many days have passed since the anchor date
      const daysSinceAnchor = Math.floor(
        (now.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate the gentle reminder threshold (5 days before deadline)
      const gentleReminderDay = intervalDays - 5;

      // Calculate the urgent reminder threshold (1 day before deadline)
      const urgentReminderDay = intervalDays - 1;

      if (daysSinceAnchor >= intervalDays) {
        // ── MISSED: sender has passed their deadline ──────────────────────────
        // Bump the anchor forward by one interval so this missed cycle
        // is not counted again on the next cron run
        const bumpedAnchor = new Date(anchor);
        bumpedAnchor.setDate(bumpedAnchor.getDate() + intervalDays);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            // Increment the missed count by 1
            missedConfirmations: user.missedConfirmations + 1,
            // Move anchor forward to prevent double-counting
            lastConfirmedAt: bumpedAnchor,
          },
        });

        missedConfirmationsUpdated += 1;
        console.log(
          `[proof-check] Missed confirmation for user: ${user.email}, total missed: ${user.missedConfirmations + 1}`
        );

      } else if (daysSinceAnchor >= urgentReminderDay) {
        // ── URGENT: 1 day before deadline ────────────────────────────────────
        // Send an urgent warning email to the sender
        const daysRemaining = intervalDays - daysSinceAnchor;

        const result = await sendProofOfLifeReminderEmail({
          senderName: user.name,
          senderEmail: user.email,
          urgency: "urgent",
          daysRemaining,
        });

        if (result.success) {
          urgentRemindersSent += 1;
          console.log(`[proof-check] Urgent reminder sent to: ${user.email}`);
        } else {
          console.error(
            `[proof-check] Failed to send urgent reminder to: ${user.email}`,
            result.error
          );
        }

      } else if (daysSinceAnchor >= gentleReminderDay) {
        // ── GENTLE: 5 days before deadline ───────────────────────────────────
        // Send a gentle reminder email to the sender
        const daysRemaining = intervalDays - daysSinceAnchor;

        const result = await sendProofOfLifeReminderEmail({
          senderName: user.name,
          senderEmail: user.email,
          urgency: "gentle",
          daysRemaining,
        });

        if (result.success) {
          gentleRemindersSent += 1;
          console.log(`[proof-check] Gentle reminder sent to: ${user.email}`);
        } else {
          console.error(
            `[proof-check] Failed to send gentle reminder to: ${user.email}`,
            result.error
          );
        }

      } else {
        // ── NORMAL: sender is within safe window, no action needed ────────────
        // Do nothing — sender is well within their confirmation period
      }
    }

    // 6) Return a summary of what happened in this run
    return Response.json({
      message: "Proof-of-life check completed.",
      gentleRemindersSent,
      urgentRemindersSent,
      missedConfirmationsUpdated,
      totalUsersChecked: users.length,
      ranAt: now.toISOString(),
    });

  } catch (err) {
    console.error("run-proof-check error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}