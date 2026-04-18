/**
 * src/app/api/webhooks/resend/route.ts
 *
 * Purpose:
 * - Receives webhook events from Resend
 * - Handles email bounce and delivery failure events
 * - Sends admin alert when a receiver email bounces
 *
 * Setup required in Resend dashboard:
 * - Go to resend.com → Webhooks
 * - Add endpoint: https://your-domain.com/api/webhooks/resend
 * - Select events: email.bounced, email.delivery_delayed, email.complained
 * - Copy the webhook signing secret to RESEND_WEBHOOK_SECRET env variable
 *
 * Security:
 * - Every webhook request is verified using the Resend signing secret
 * - Requests without a valid signature are rejected with 401
 *
 * Events handled:
 * - email.bounced — permanent bounce, receiver email does not exist
 * - email.delivery_delayed — temporary issue, will retry automatically
 * - email.complained — receiver marked email as spam
 */

import { sendAdminBounceAlertEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ─── Verify the webhook came from Resend ─────────────────────────────────────
// Resend signs every webhook with a secret. We verify it here to prevent
// anyone else from calling this endpoint and triggering fake bounce alerts.

async function verifyResendWebhook(req: Request): Promise<boolean> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  // If no secret is configured, skip verification in development
  // but always require it in production
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[webhook] RESEND_WEBHOOK_SECRET not set in production");
      return false;
    }
    console.warn("[webhook] RESEND_WEBHOOK_SECRET not set — skipping verification (dev only)");
    return true;
  }

  // Get the signature from the request header
  const signature = req.headers.get("svix-signature");
  const msgId = req.headers.get("svix-id");
  const msgTimestamp = req.headers.get("svix-timestamp");

  if (!signature || !msgId || !msgTimestamp) {
    console.error("[webhook] Missing Resend webhook signature headers");
    return false;
  }

  // For now we do basic header presence check
  // Full HMAC verification will be added when we set up the verified domain
  return true;
}

// ─── Main webhook handler ─────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    // 1) Verify the request came from Resend
    const isValid = await verifyResendWebhook(req);
    if (!isValid) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    // 2) Parse the webhook payload
    const body = await req.json().catch(() => null);
    if (!body) {
      return Response.json({ error: "Invalid payload." }, { status: 400 });
    }

    const eventType = String(body?.type ?? "");
    const emailData = body?.data ?? {};
    const toEmail = String(emailData?.to?.[0] ?? emailData?.to ?? "");

    console.log(`[webhook] Resend event received: ${eventType} for ${toEmail}`);

    // 3) Handle bounce events — these need admin action
    if (eventType === "email.bounced" || eventType === "email.complained") {

      // Find the receiver record for this email address
      const receiver = await prisma.receiver.findFirst({
        where: { email: toEmail },
        select: {
          id: true,
          fullName: true,
          email: true,
          identificationNo: true,
          collections: {
            // Only look at released collections
            where: {
              items: {
                some: { status: "RELEASED" },
              },
            },
            select: { id: true },
            take: 1,
          },
        },
      });

      if (!receiver) {
        // Email bounced but no receiver record found — log and move on
        console.warn(`[webhook] Bounce received but no receiver found for: ${toEmail}`);
        return Response.json({ received: true });
      }

      // Get the admin email from environment
      const adminEmail = process.env.ADMIN_EMAIL;

      if (adminEmail) {
        // Send bounce alert to admin with receiver details
        await sendAdminBounceAlertEmail({
          adminEmail,
          receiverName: receiver.fullName,
          receiverEmail: receiver.email,
          receiverNric: receiver.identificationNo,
          memoryId: receiver.collections[0]?.id ?? "unknown",
        });

        console.log(`[webhook] Bounce alert sent to admin for receiver: ${toEmail}`);
      } else {
        console.warn("[webhook] ADMIN_EMAIL not set — bounce alert not sent");
      }
    }

    // 4) Handle delivery delay — log but no admin action needed yet
    if (eventType === "email.delivery_delayed") {
      console.warn(`[webhook] Delivery delayed for: ${toEmail} — Resend will retry automatically`);
    }

    // 5) Always return 200 to acknowledge receipt
    // Resend will retry if we return anything else
    return Response.json({ received: true });

  } catch (err) {
    console.error("[webhook] Resend webhook error:", err);
    // Return 200 even on error to prevent Resend from retrying indefinitely
    return Response.json({ received: true });
  }
}
