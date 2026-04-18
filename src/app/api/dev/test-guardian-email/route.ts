/**
 * src/app/api/dev/test-guardian-email/route.ts
 *
 * DEV AND UAT TESTING ONLY
 *
 * Purpose:
 * - Test the guardian notification email template
 * - Sends a sample guardian email to the address provided
 * - This route will be removed in production
 *
 * Usage:
 * POST /api/dev/test-guardian-email
 * Body: { "guardianEmail": "test@gmail.com" }
 */

import { sendGuardianNotificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1) Read the target email from request body
    const body = await req.json().catch(() => ({}));
    const guardianEmail = String(body?.guardianEmail ?? "").trim();

    if (!guardianEmail) {
      return Response.json(
        { error: "guardianEmail is required." },
        { status: 400 }
      );
    }

    // 2) Send a test guardian notification email with sample data
    const result = await sendGuardianNotificationEmail({
      guardianName: "John Tan",
      guardianEmail,
      senderName: "Lee Kok Sang",
      receiverName: "How Mei Ern",
      collectionTitle: "A message from Dad",
      // Use a fake token for testing — the link will not work but the email will
      inviteToken: "test-token-for-email-preview-only",
    });

    if (!result.success) {
      return Response.json(
        { error: "Email failed to send.", detail: result.error },
        { status: 500 }
      );
    }

    // 3) Return success with the Resend email ID
    return Response.json({
      message: "Guardian notification email sent successfully.",
      emailId: result.id,
    });

  } catch (err) {
    console.error("[dev] test-guardian-email error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
