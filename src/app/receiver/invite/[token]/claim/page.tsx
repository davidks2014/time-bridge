/**
 * src/app/receiver/invite/[token]/claim/page.tsx
 *
 * Purpose:
 * - Shown when a receiver clicks their invite link and confirms they are correct
 * - Collects their details to create an account and link to the memory
 * - Includes consent checkbox for PDPA compliance
 * - Includes a clear decline button if they are not the intended receiver
 */

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type InvitePayload = {
  token: string;
  receiverEmail: string;
  receiverName: string | null;
  senderName: string | null;
  senderEmail: string | null;
  // Whether the receiver already has a Time Bridge account
  hasExistingAccount: boolean;
};

export default function InviteClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const { token } = React.use(params);

  const [invite, setInvite] = useState<InvitePayload | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [identificationNo, setIdentificationNo] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");

  // Verification documents
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);

  // Consent
  const [consentAgreed, setConsentAgreed] = useState(false);

  // UI state
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [declined, setDeclined] = useState(false);

  async function loadInvite() {
    setError("");
    try {
      const res = await fetch(`/api/receiver/invite/${token}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed to load invite.");
        setInvite(null);
        return;
      }

      setInvite(json.invite ?? null);

      // Pre-fill email if provided in invite
      if (json.invite?.receiverEmail) {
        setEmail(json.invite.receiverEmail);
      }
    } catch {
      setError("Network error while loading invite.");
      setInvite(null);
    } finally {
      setLoadingInvite(false);
    }
  }

  useEffect(() => {
    loadInvite();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function submitClaim() {
    setError("");
    setInfo("");

    // Validate all required fields
    if (!email.trim()) return setError("Email is required.");
    if (!password.trim()) return setError("Password is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!identificationNo.trim()) return setError("NRIC / identification number is required.");
    if (!phoneNumber.trim()) return setError("Phone number is required.");
    if (!address.trim()) return setError("Address is required.");
    if (!idFront) return setError("Please upload your NRIC front image.");
    if (!consentAgreed) return setError("Please agree to the consent statement to continue.");

    setSubmitting(true);

    try {
      const form = new FormData();
      form.append("token", token);
      form.append("email", email.trim());
      form.append("password", password);
      form.append("identificationNo", identificationNo.trim());
      form.append("phoneNumber", phoneNumber.trim());
      form.append("address", address.trim());
      form.append("idFront", idFront);
      if (idBack) form.append("idBack", idBack);
      form.append("consentAgreed", "true");

      const res = await fetch("/api/receiver/invite/claim", {
        method: "POST",
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed to submit claim. Please try again.");
        return;
      }

      setInfo("Claim submitted successfully. Our team will verify your identity and approve your access. Redirecting...");
      setTimeout(() => router.push("/login"), 2000);

    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDecline() {
    setDeclined(true);
  }

  if (loadingInvite) {
    return <div style={{ padding: 20 }}>Loading invite details...</div>;
  }

  if (!invite && !loadingInvite) {
    return (
      <div style={{ padding: 20, maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Invite not found</h1>
        <div style={{ color: "#666", marginTop: 8 }}>
          This invite link may have expired or already been used.
        </div>
        <button style={{ marginTop: 16 }} onClick={() => router.push("/login")}>
          Go to login
        </button>
      </div>
    );
  }

  // Declined state
  if (declined) {
    return (
      <div style={{ padding: 20, maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Thank you</h1>
        <div style={{ color: "#666", marginTop: 8, lineHeight: 1.6 }}>
          You have indicated this memory was not intended for you.
          No further action is needed. If you believe you received this
          in error, please contact the sender or our support team.
        </div>
        <button style={{ marginTop: 16 }} onClick={() => router.push("/")}>
          Go to homepage
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900 }}>Claim your memory</h1>

      {/* Invite summary */}
      {invite && (
        <div style={{
          marginTop: 16,
          padding: 16,
          background: "#f0fdf8",
          border: "1px solid #6ee7b7",
          borderRadius: 12,
        }}>
          <div style={{ fontWeight: 700, color: "#065f46" }}>
            A personal message has been left for you
          </div>
          <div style={{ marginTop: 8, color: "#047857", fontSize: 14, lineHeight: 1.6 }}>
            From: <b>{invite.senderName ?? "Someone"}</b>
            {invite.senderEmail ? ` (${invite.senderEmail})` : ""}
          </div>
          <div style={{ marginTop: 4, color: "#047857", fontSize: 14 }}>
            Intended for: <b>{invite.receiverName ?? "you"}</b>
          </div>
        </div>
      )}

      {/* Not the right person? */}
      <div style={{
        marginTop: 14,
        padding: "10px 14px",
        background: "#fafafa",
        border: "1px solid #eee",
        borderRadius: 8,
        fontSize: 13,
        color: "#666",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
      }}>
        <span>Not the intended recipient?</span>
        <button
          onClick={handleDecline}
          style={{
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 6,
            padding: "4px 12px",
            cursor: "pointer",
            fontSize: 12,
            color: "#666",
          }}
        >
          This is not for me
        </button>
      </div>

      {/* Existing account detected — show login prompt */}
      {invite && invite.hasExistingAccount ? (
        <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>
            You already have a Time Bridge account
          </div>
          <div style={{
            padding: "12px 16px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            color: "#1e40af",
            fontSize: 13,
            lineHeight: 1.6,
          }}>
            We found an existing account for <b>{invite.receiverEmail}</b>.
            Please log in to automatically claim this memory — no need to
            create a new account.
          </div>

          <button
            onClick={() => router.push(
              `/login?callbackUrl=/receiver/invite/${token}/link`
            )}
          >
            Log in to claim my memory
          </button>

          <div style={{ fontSize: 12, color: "#999", textAlign: "center" }}>
            Using a different email?{" "}
            <span
              style={{ color: "#1D9E75", cursor: "pointer", textDecoration: "underline" }}
              onClick={() => {
                if (invite) {
                  setInvite({ ...invite, hasExistingAccount: false });
                }
              }}
            >
              Create a new account instead
            </span>
          </div>
        </div>
      ) : (
      <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 15 }}>Create your account</div>
        <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>
          To access your memory, please create an account. We need to verify
          your identity to make sure the message reaches the right person.
        </div>

        <input
          placeholder="Email address *"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password (min 8 characters) *"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          placeholder="NRIC / identification number *"
          value={identificationNo}
          onChange={(e) => setIdentificationNo(e.target.value)}
        />

        <input
          placeholder="Phone number *"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        <input
          placeholder="Residential address *"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        {/* Verification documents */}
        <div style={{ fontWeight: 900, fontSize: 15, marginTop: 4 }}>
          Identity verification
        </div>
        <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>
          Please upload a photo of your NRIC so we can verify you are
          the intended recipient. Front image is required.
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>
            NRIC front image *
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setIdFront(e.target.files?.[0] ?? null)}
          />
          {idFront && (
            <div style={{ marginTop: 4, fontSize: 12, color: "#1D9E75" }}>
              Selected: {idFront.name}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>
            NRIC back image (optional)
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setIdBack(e.target.files?.[0] ?? null)}
          />
          {idBack && (
            <div style={{ marginTop: 4, fontSize: 12, color: "#1D9E75" }}>
              Selected: {idBack.name}
            </div>
          )}
        </div>

        {/* Consent */}
        <label style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          cursor: "pointer",
          marginTop: 4,
        }}>
          <input
            type="checkbox"
            checked={consentAgreed}
            onChange={(e) => setConsentAgreed(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "#444" }}>
            I confirm I am the intended recipient of this memory and I consent
            to Time Bridge storing my personal details to verify my identity
            and deliver this message to me.
          </span>
        </label>

        {/* Error and success messages */}
        {error && (
          <div style={{
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            color: "#991b1b",
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {info && (
          <div style={{
            padding: "10px 14px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            color: "#166534",
            fontSize: 13,
          }}>
            {info}
          </div>
        )}

        <button
          onClick={submitClaim}
          disabled={submitting}
          style={{ marginTop: 4 }}
        >
          {submitting ? "Submitting..." : "Claim my memory"}
        </button>
      </div>

      )}
    </div>
  );
}
