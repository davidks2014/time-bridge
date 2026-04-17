/**
 * src/lib/email.ts
 *
 * Purpose:
 * - Central email sending utility for Time Bridge
 * - All emails go through this one file
 * - Uses Resend as the email provider
 *
 * Usage:
 *   import { sendReceiverInviteEmail } from "@/lib/email";
 *   await sendReceiverInviteEmail({ ... });
 *
 * Environment variables required:
 *   RESEND_API_KEY       – from resend.com dashboard
 *   NEXT_PUBLIC_APP_URL  – e.g. https://your-app.vercel.app
 */

import { Resend } from "resend";

// ─── Resend client ────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Sender address ───────────────────────────────────────────────────────────
// Must be a verified domain in your Resend account.
// During development you can use: onboarding@resend.dev (Resend default)
// For production: noreply@yourdomain.com

const FROM_ADDRESS = "Time Bridge <noreply@yourdomain.com>";

// ─── App base URL ─────────────────────────────────────────────────────────────

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type EmailResult =
  | { success: true; id: string }
  | { success: false; error: string };

// ─── 1. Receiver invite email ─────────────────────────────────────────────────
// Sent when a memory is released and the receiver is not yet registered.
// This is the most important email in the entire app.

type SendReceiverInviteEmailParams = {
  receiverName: string;
  receiverEmail: string;
  senderName: string;
  inviteToken: string;
};

export async function sendReceiverInviteEmail(
  params: SendReceiverInviteEmailParams
): Promise<EmailResult> {
  const { receiverName, receiverEmail, senderName, inviteToken } = params;

  const claimUrl = `${getAppUrl()}/receiver/invite/${inviteToken}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: receiverEmail,
      subject: `${senderName} has left you a personal message`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">

          <h2 style="font-size: 22px; font-weight: 500; margin-bottom: 8px;">
            A message was left for you
          </h2>

          <p style="color: #555; line-height: 1.7;">
            Dear ${receiverName},
          </p>

          <p style="color: #555; line-height: 1.7;">
            Someone you knew – <strong>${senderName}</strong> – entrusted
            Time Bridge to safely deliver a personal message to you.
            This message was prepared in advance and is now ready for you to receive.
          </p>

          <p style="color: #555; line-height: 1.7;">
            To claim your message, please click the button below.
            You will be asked to verify your identity before anything is shown to you.
            This is to ensure your message reaches only you.
          </p>

          <div style="margin: 32px 0;">
            <a
              href="${claimUrl}"
              style="
                background-color: #1D9E75;
                color: white;
                padding: 14px 28px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 500;
                font-size: 16px;
                display: inline-block;
              "
            >
              Claim your message
            </a>
          </div>

          <p style="color: #888; font-size: 13px; line-height: 1.7;">
            If the button does not work, copy and paste this link into your browser:<br/>
            <a href="${claimUrl}" style="color: #1D9E75;">${claimUrl}</a>
          </p>

          <p style="color: #888; font-size: 13px; line-height: 1.7;">
            This link will expire in 14 days. If you believe you received this email
            by mistake, you may safely ignore it. Nothing will happen without your action.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

          <p style="color: #aaa; font-size: 12px;">
            Time Bridge – Legacy message delivery service, Singapore.<br/>
            If you have questions, contact us at support@yourdomain.com
          </p>

        </div>
      `,
    });

    if (error) {
      console.error("[email] sendReceiverInviteEmail failed:", error);
      return { success: false, error: error.message };
    }

    console.log("[email] sendReceiverInviteEmail sent:", data?.id);
    return { success: true, id: data?.id ?? "" };
  } catch (err) {
    const message = (err as Error)?.message ?? "Unknown error";
    console.error("[email] sendReceiverInviteEmail exception:", message);
    return { success: false, error: message };
  }
}

// ─── 2. Proof-of-life reminder email ─────────────────────────────────────────
// Sent to the sender when they are approaching their confirmation deadline.
// urgency: "gentle" = day 25, "urgent" = day 29

type SendProofOfLifeReminderParams = {
  senderName: string;
  senderEmail: string;
  urgency: "gentle" | "urgent";
  daysRemaining: number;
};

export async function sendProofOfLifeReminderEmail(
  params: SendProofOfLifeReminderParams
): Promise<EmailResult> {
  const { senderName, senderEmail, urgency, daysRemaining } = params;

  const confirmUrl = `${getAppUrl()}/dashboard`;

  const subject =
    urgency === "gentle"
      ? "Time Bridge – please confirm you are well"
      : `Time Bridge – action required within ${daysRemaining} days`;

  const bodyText =
    urgency === "gentle"
      ? `This is a gentle reminder that your Time Bridge proof-of-life confirmation
         is due in ${daysRemaining} days. Simply log in to your dashboard and click
         "I'm Alive" to reset your timer.`
      : `Your Time Bridge proof-of-life confirmation is overdue. If we do not hear
         from you within ${daysRemaining} days, your trusted contact will be notified
         and your memories may begin the release process. Please log in immediately
         to confirm you are well.`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: senderEmail,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">

          <h2 style="font-size: 22px; font-weight: 500; margin-bottom: 8px;">
            ${urgency === "gentle" ? "A gentle reminder from Time Bridge" : "Important – action required"}
          </h2>

          <p style="color: #555; line-height: 1.7;">
            Dear ${senderName},
          </p>

          <p style="color: #555; line-height: 1.7;">
            ${bodyText}
          </p>

          <div style="margin: 32px 0;">
            <a
              href="${confirmUrl}"
              style="
                background-color: ${urgency === "gentle" ? "#1D9E75" : "#D85A30"};
                color: white;
                padding: 14px 28px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 500;
                font-size: 16px;
                display: inline-block;
              "
            >
              Confirm I am well
            </a>
          </div>

          <p style="color: #888; font-size: 13px; line-height: 1.7;">
            Simply logging in to your Time Bridge account also counts as confirmation.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

          <p style="color: #aaa; font-size: 12px;">
            Time Bridge – Legacy message delivery service, Singapore.<br/>
            If you have questions, contact us at support@yourdomain.com
          </p>

        </div>
      `,
    });

    if (error) {
      console.error("[email] sendProofOfLifeReminderEmail failed:", error);
      return { success: false, error: error.message };
    }

    console.log("[email] sendProofOfLifeReminderEmail sent:", data?.id);
    return { success: true, id: data?.id ?? "" };
  } catch (err) {
    const message = (err as Error)?.message ?? "Unknown error";
    console.error("[email] sendProofOfLifeReminderEmail exception:", message);
    return { success: false, error: message };
  }
}

// ─── 3. Trusted contact alert email ──────────────────────────────────────────
// Sent when sender has not responded and trusted contact needs to be alerted.

type SendTrustedContactAlertParams = {
  trustedContactName: string;
  trustedContactEmail: string;
  senderName: string;
  stage: "warning" | "critical";
};

export async function sendTrustedContactAlertEmail(
  params: SendTrustedContactAlertParams
): Promise<EmailResult> {
  const { trustedContactName, trustedContactEmail, senderName, stage } = params;

  const subject =
    stage === "warning"
      ? `Time Bridge – ${senderName} has not confirmed recently`
      : `Time Bridge – urgent: ${senderName} is unresponsive`;

  const bodyText =
    stage === "warning"
      ? `${senderName} has nominated you as their trusted contact on Time Bridge.
         We have been unable to reach them for some time. If you are in contact with
         them, please ask them to log in to Time Bridge and confirm they are well.
         No action has been taken yet.`
      : `This is an urgent message. ${senderName} has not responded to our reminders
         for an extended period. As their trusted contact, we are asking you to confirm
         whether they are still reachable. If they have passed away, please contact us
         at support@yourdomain.com so we can proceed appropriately.
         If they are alive and well, please ask them to log in to Time Bridge immediately.`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: trustedContactEmail,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">

          <h2 style="font-size: 22px; font-weight: 500; margin-bottom: 8px;">
            ${stage === "warning" ? "Trusted contact notice" : "Urgent – trusted contact required"}
          </h2>

          <p style="color: #555; line-height: 1.7;">
            Dear ${trustedContactName},
          </p>

          <p style="color: #555; line-height: 1.7;">
            ${bodyText}
          </p>

          <p style="color: #555; line-height: 1.7;">
            You were nominated by ${senderName} as someone they trust.
            Your role is simply to help us confirm their status – you will not
            be given access to any of their private messages.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

          <p style="color: #aaa; font-size: 12px;">
            Time Bridge – Legacy message delivery service, Singapore.<br/>
            Reply to this email or contact us at support@yourdomain.com
          </p>

        </div>
      `,
    });

    if (error) {
      console.error("[email] sendTrustedContactAlertEmail failed:", error);
      return { success: false, error: error.message };
    }

    console.log("[email] sendTrustedContactAlertEmail sent:", data?.id);
    return { success: true, id: data?.id ?? "" };
  } catch (err) {
    const message = (err as Error)?.message ?? "Unknown error";
    console.error("[email] sendTrustedContactAlertEmail exception:", message);
    return { success: false, error: message };
  }
}

// ─── 4. Admin bounce alert ────────────────────────────────────────────────────
// Sent internally to admin when a receiver email could not be delivered.

type SendAdminBounceAlertParams = {
  adminEmail: string;
  receiverName: string;
  receiverEmail: string;
  receiverNric: string;
  memoryId: string;
};

export async function sendAdminBounceAlertEmail(
  params: SendAdminBounceAlertParams
): Promise<EmailResult> {
  const { adminEmail, receiverName, receiverEmail, receiverNric, memoryId } =
    params;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: adminEmail,
      subject: `Time Bridge – delivery failed for ${receiverName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">

          <h2 style="font-size: 22px; font-weight: 500; margin-bottom: 8px;">
            Email delivery failed – action required
          </h2>

          <p style="color: #555; line-height: 1.7;">
            A memory release notification could not be delivered by email.
            Please review this case and proceed with the next delivery channel
            (SMS, guardian contact, or physical visit).
          </p>

          <table style="border-collapse: collapse; width: 100%; margin: 24px 0;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888; font-size: 13px; width: 140px;">Receiver name</td>
              <td style="padding: 10px 0; font-size: 13px;">${receiverName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888; font-size: 13px;">Receiver email</td>
              <td style="padding: 10px 0; font-size: 13px;">${receiverEmail}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888; font-size: 13px;">Receiver NRIC</td>
              <td style="padding: 10px 0; font-size: 13px;">${receiverNric}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px;">Memory ID</td>
              <td style="padding: 10px 0; font-size: 13px;">${memoryId}</td>
            </tr>
          </table>

          <p style="color: #888; font-size: 13px;">
            Log in to the Time Bridge admin panel to manage this case.
          </p>

        </div>
      `,
    });

    if (error) {
      console.error("[email] sendAdminBounceAlertEmail failed:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id ?? "" };
  } catch (err) {
    const message = (err as Error)?.message ?? "Unknown error";
    console.error("[email] sendAdminBounceAlertEmail exception:", message);
    return { success: false, error: message };
  }
}