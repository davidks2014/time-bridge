/**
 * src/app/api/dev/test-trusted-contact-email/route.ts
 *
 * DEV AND UAT TESTING ONLY
 *
 * Purpose:
 * - Test both stages of the trusted contact alert email
 * - stage "warning" = sender has not responded for a while
 * - stage "critical" = sender is very likely unresponsive
 *
 * Usage:
 * POST /api/dev/test-trusted-contact-email
 * Body: {
 *   "trustedContactEmail": "test@gmail.com",
 *   "stage": "warning"
 * }
 */

import { sendTrustedContactAlertEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1) Read the target email and stage from request body
    const body = await req.json().catch(() => ({}));
    const trustedContactEmail = String(body?.trustedContactEmail ?? "").trim();

    // stage must be either "warning" or "critical"
    const stage = String(body?.stage ?? "warning").trim() as "warning" | "critical";

    if (!trustedContactEmail) {
      return Response.json(
        { error: "trustedContactEmail is required." },
        { status: 400 }
      );
    }

    if (stage !== "warning" && stage !== "critical") {
      return Response.json(
        { error: "stage must be warning or critical." },
        { status: 400 }
      );
    }

    // 2) Send the test trusted contact alert email with sample data
    const result = await sendTrustedContactAlertEmail({
      trustedContactName: "Ahmad Bin Ismail",
      trustedContactEmail,
      senderName: "Lee Kok Sang",
      stage,
    });

    if (!result.success) {
      return Response.json(
        { error: "Email failed to send.", detail: result.error },
        { status: 500 }
      );
    }

    // 3) Return success with the Resend email ID
    return Response.json({
      message: `Trusted contact alert email (${stage}) sent successfully.`,
      emailId: result.id,
      stage,
    });

  } catch (err) {
    console.error("[dev] test-trusted-contact-email error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
