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

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set in environment variables.");
  }
  return new Resend(apiKey);
}

// ─── Sender address ───────────────────────────────────────────────────────────
// Using Resend test address for UAT.
// For production, replace with a verified domain email like noreply@yourdomain.com
const FROM_ADDRESS = "Time Bridge <onboarding@resend.dev>";

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

// ─── 1. Receiver invite / release notification email ──────────────────────────
// Sent when a memory is released and the receiver is not yet registered.
// This is the most important email in the entire app — it may be the first
// time the receiver hears about Time Bridge, and they may be grieving.
// The tone must be warm, clear, and trustworthy.

type SendReceiverInviteEmailParams = {
  // The receiver's full name as recorded by the sender
  receiverName: string;
  // The receiver's email address
  receiverEmail: string;
  // The sender's full name — shown in the email so receiver knows who it is from
  senderName: string;
  // The invite token used to build the claim link
  inviteToken: string;
  // The memory collection title — gives the receiver context about what to expect
  collectionTitle?: string;
  // How many memory items are waiting — e.g. "3 messages are waiting for you"
  memoryCount?: number;
};

export async function sendReceiverInviteEmail(
  params: SendReceiverInviteEmailParams
): Promise<EmailResult> {
  const {
    receiverName,
    receiverEmail,
    senderName,
    inviteToken,
    collectionTitle,
    memoryCount,
  } = params;

  // Build the full claim URL the receiver will click
  const claimUrl = `${getAppUrl()}/receiver/invite/${inviteToken}`;

  // Build a human-readable count string e.g. "1 message" or "3 messages"
  const countText =
    memoryCount && memoryCount > 1
      ? `${memoryCount} personal messages are`
      : "a personal message is";

  // Build optional collection title line
  const collectionLine = collectionTitle
    ? `<p style="color: #555; line-height: 1.7;">
         The memory collection is titled: <strong>${collectionTitle}</strong>
       </p>`
    : "";

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to: receiverEmail,
      subject: `${senderName} has left you a personal message`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">

          <div style="background: #f0fdf8; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="font-size: 22px; font-weight: 500; margin: 0 0 8px 0; color: #085041;">
              A message has been left for you
            </h2>
            <p style="margin: 0; color: #0F6E56; font-size: 14px;">
              Time Bridge — Legacy message delivery
            </p>
          </div>

          <p style="color: #555; line-height: 1.7;">
            Dear ${receiverName},
          </p>

          <p style="color: #555; line-height: 1.7;">
            Someone you knew — <strong>${senderName}</strong> —
            cared enough to prepare something for you in advance.
            ${countText} now ready and waiting safely for you on Time Bridge.
          </p>

          ${collectionLine}

          <p style="color: #555; line-height: 1.7;">
            Time Bridge is a secure legacy message service based in Singapore.
            <strong>${senderName}</strong> trusted us to deliver this to you
            at the right time. We take that trust very seriously.
          </p>

          <p style="color: #555; line-height: 1.7;">
            To receive your message, please click the button below.
            You will be asked to verify your identity first —
            this ensures the message reaches only you, as intended.
          </p>

          <div style="margin: 32px 0; text-align: center;">
            <a
              href="${claimUrl}"
              style="
                background-color: #1D9E75;
                color: white;
                padding: 16px 36px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 500;
                font-size: 16px;
                display: inline-block;
              "
            >
              Claim your message from ${senderName}
            </a>
          </div>

          <div style="
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
          ">
            <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.7;">
              <strong>Please note:</strong> You will need to verify your identity
              using your Singapore NRIC before the message is shown to you.
              This protects the privacy of both you and the sender.
            </p>
          </div>

          <p style="color: #888; font-size: 13px; line-height: 1.7;">
            If the button does not work, copy and paste this link into your browser:<br/>
            <a href="${claimUrl}" style="color: #1D9E75; word-break: break-all;">${claimUrl}</a>
          </p>

          <p style="color: #888; font-size: 13px; line-height: 1.7;">
            This link will expire in 14 days. If you believe you received this
            email by mistake, you may safely ignore it.
            Nothing will happen without your action.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

          <p style="color: #aaa; font-size: 12px; line-height: 1.7;">
            Time Bridge — Legacy message delivery service, Singapore.<br/>
            If you have questions or concerns, contact us at support@yourdomain.com<br/>
            This is an automated message. Please do not reply directly to this email.
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
    const { data, error } = await getResendClient().emails.send({
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
    const { data, error } = await getResendClient().emails.send({
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

// ─── 5. Guardian notification email ──────────────────────────────────────────
// Sent when a memory is released and the receiver is a child or unknown.
// The guardian is a trusted adult nominated by the sender to hold the
// message safely and deliver it to the child when the time is right.
// Important: the guardian never sees the memory content — they are
// only notified that a message exists and told how to claim it on
// behalf of the receiver.

type SendGuardianNotificationEmailParams = {
  // The guardian's full name
  guardianName: string;
  // The guardian's email address
  guardianEmail: string;
  // The sender's full name — so the guardian knows who left the message
  senderName: string;
  // The child receiver's full name — so the guardian knows who it is for
  receiverName: string;
  // The memory collection title
  collectionTitle?: string;
  // The invite token — guardian uses this to claim on behalf of the child
  inviteToken: string;
};

export async function sendGuardianNotificationEmail(
  params: SendGuardianNotificationEmailParams
): Promise<EmailResult> {
  const {
    guardianName,
    guardianEmail,
    senderName,
    receiverName,
    collectionTitle,
    inviteToken,
  } = params;

  // Build the claim URL the guardian will use
  const claimUrl = `${getAppUrl()}/receiver/invite/${inviteToken}`;

  // Build optional collection title line
  const collectionLine = collectionTitle
    ? `<p style="color: #555; line-height: 1.7;">
         The memory collection is titled: <strong>${collectionTitle}</strong>
       </p>`
    : "";

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to: guardianEmail,
      subject: `You are holding a legacy message for ${receiverName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">

          <div style="background: #f5f3ff; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="font-size: 22px; font-weight: 500; margin: 0 0 8px 0; color: #3C3489;">
              A legacy message is waiting
            </h2>
            <p style="margin: 0; color: #534AB7; font-size: 14px;">
              Time Bridge — Legacy message delivery
            </p>
          </div>

          <p style="color: #555; line-height: 1.7;">
            Dear ${guardianName},
          </p>

          <p style="color: #555; line-height: 1.7;">
            You have been nominated as the trusted guardian for
            <strong>${receiverName}</strong> by <strong>${senderName}</strong>.
          </p>

          <p style="color: #555; line-height: 1.7;">
            <strong>${senderName}</strong> has left a personal legacy message
            intended for <strong>${receiverName}</strong>. As the nominated guardian,
            you are trusted to hold this message safely and share it with
            <strong>${receiverName}</strong> when the time is right.
          </p>

          ${collectionLine}

          <div style="
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
          ">
            <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.7;">
              <strong>Important:</strong> This message was written privately for
              <strong>${receiverName}</strong>. As guardian, you will be able to
              securely hold and eventually transfer it to them. You will need to
              verify your identity using your Singapore NRIC before accessing
              the guardian portal.
            </p>
          </div>

          <p style="color: #555; line-height: 1.7;">
            To access the guardian portal and securely hold this message,
            please click the button below:
          </p>

          <div style="margin: 32px 0; text-align: center;">
            <a
              href="${claimUrl}"
              style="
                background-color: #534AB7;
                color: white;
                padding: 16px 36px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 500;
                font-size: 16px;
                display: inline-block;
              "
            >
              Access guardian portal
            </a>
          </div>

          <p style="color: #888; font-size: 13px; line-height: 1.7;">
            If the button does not work, copy and paste this link:<br/>
            <a href="${claimUrl}" style="color: #534AB7; word-break: break-all;">${claimUrl}</a>
          </p>

          <p style="color: #888; font-size: 13px; line-height: 1.7;">
            This link will expire in 14 days. If you have any questions or
            concerns, please contact us at support@yourdomain.com
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

          <p style="color: #aaa; font-size: 12px; line-height: 1.7;">
            Time Bridge — Legacy message delivery service, Singapore.<br/>
            You are receiving this because ${senderName} nominated you as
            a trusted guardian for ${receiverName}.<br/>
            This is an automated message. Please do not reply directly to this email.
          </p>

        </div>
      `,
    });

    if (error) {
      console.error("[email] sendGuardianNotificationEmail failed:", error);
      return { success: false, error: error.message };
    }

    console.log("[email] sendGuardianNotificationEmail sent:", data?.id);
    return { success: true, id: data?.id ?? "" };

  } catch (err) {
    const message = (err as Error)?.message ?? "Unknown error";
    console.error("[email] sendGuardianNotificationEmail exception:", message);
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
    const { data, error } = await getResendClient().emails.send({
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

// ─── 6. Verification approved email ──────────────────────────────────────────

type SendVerificationApprovedEmailParams = {
  userName: string;
  userEmail: string;
};

export async function sendVerificationApprovedEmail(
  params: SendVerificationApprovedEmailParams
): Promise<EmailResult> {
  const { userName, userEmail } = params;
  const dashboardUrl = `${getAppUrl()}/dashboard`;

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to: userEmail,
      subject: "Your Time Bridge account has been verified",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">

          <div style="background: #f0fdf8; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="font-size: 22px; font-weight: 500; margin: 0 0 8px 0; color: #085041;">
              Your account is verified
            </h2>
            <p style="margin: 0; color: #0F6E56; font-size: 14px;">
              Time Bridge — Legacy message delivery
            </p>
          </div>

          <p style="color: #555; line-height: 1.7;">
            Dear ${userName},
          </p>

          <p style="color: #555; line-height: 1.7;">
            Great news — your identity has been verified and your
            Time Bridge account is now fully active.
            You can now create legacy messages for your loved ones.
          </p>

          <div style="margin: 32px 0; text-align: center;">
            <a
              href="${dashboardUrl}"
              style="
                background-color: #1D9E75;
                color: white;
                padding: 16px 36px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 500;
                font-size: 16px;
                display: inline-block;
              "
            >
              Go to my dashboard
            </a>
          </div>

          <p style="color: #888; font-size: 13px; line-height: 1.7;">
            Thank you for trusting Time Bridge with something so important.
            Your messages will be kept safe until the time comes to deliver them.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

          <p style="color: #aaa; font-size: 12px;">
            Time Bridge — Legacy message delivery service, Singapore.<br/>
            If you have questions, contact us at support@yourdomain.com
          </p>

        </div>
      `,
    });

    if (error) {
      console.error("[email] sendVerificationApprovedEmail failed:", error);
      return { success: false, error: error.message };
    }

    console.log("[email] sendVerificationApprovedEmail sent:", data?.id);
    return { success: true, id: data?.id ?? "" };

  } catch (err) {
    const message = (err as Error)?.message ?? "Unknown error";
    console.error("[email] sendVerificationApprovedEmail exception:", message);
    return { success: false, error: message };
  }
}

// ─── 7. Verification rejected email ──────────────────────────────────────────

type SendVerificationRejectedEmailParams = {
  userName: string;
  userEmail: string;
  rejectReason: string;
};

export async function sendVerificationRejectedEmail(
  params: SendVerificationRejectedEmailParams
): Promise<EmailResult> {
  const { userName, userEmail, rejectReason } = params;
  const resubmitUrl = `${getAppUrl()}/pending-verification`;

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to: userEmail,
      subject: "Action required — Time Bridge verification",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">

          <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="font-size: 22px; font-weight: 500; margin: 0 0 8px 0; color: #991b1b;">
              Verification requires attention
            </h2>
            <p style="margin: 0; color: #b91c1c; font-size: 14px;">
              Time Bridge — Legacy message delivery
            </p>
          </div>

          <p style="color: #555; line-height: 1.7;">
            Dear ${userName},
          </p>

          <p style="color: #555; line-height: 1.7;">
            We were unable to verify your identity with the documents provided.
            Please review the reason below and resubmit with updated documents.
          </p>

          <div style="
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
          ">
            <p style="margin: 0; color: #991b1b; font-size: 13px; font-weight: 500;">
              Reason:
            </p>
            <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 13px; line-height: 1.7;">
              ${rejectReason}
            </p>
          </div>

          <p style="color: #555; line-height: 1.7;">
            Please log in and resubmit your verification documents.
            Make sure your ID photo is clear, well-lit, and shows all four corners.
          </p>

          <div style="margin: 32px 0; text-align: center;">
            <a
              href="${resubmitUrl}"
              style="
                background-color: #dc2626;
                color: white;
                padding: 16px 36px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 500;
                font-size: 16px;
                display: inline-block;
              "
            >
              Resubmit my documents
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

          <p style="color: #aaa; font-size: 12px;">
            Time Bridge — Legacy message delivery service, Singapore.<br/>
            If you have questions, contact us at support@yourdomain.com
          </p>

        </div>
      `,
    });

    if (error) {
      console.error("[email] sendVerificationRejectedEmail failed:", error);
      return { success: false, error: error.message };
    }

    console.log("[email] sendVerificationRejectedEmail sent:", data?.id);
    return { success: true, id: data?.id ?? "" };

  } catch (err) {
    const message = (err as Error)?.message ?? "Unknown error";
    console.error("[email] sendVerificationRejectedEmail exception:", message);
    return { success: false, error: message };
  }
}