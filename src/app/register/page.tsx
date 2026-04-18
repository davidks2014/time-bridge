/**
 * src/app/register/page.tsx
 *
 * Purpose:
 * - Register a new sender account
 * - Collect all mandatory profile fields
 * - Collect trusted contact details (required for proof-of-life escalation)
 * - Collect 4 explicit consent checkboxes (required for PDPA compliance)
 * - Upload NRIC verification images
 *
 * All 4 consent checkboxes must be ticked before account can be created.
 * Trusted contact details are mandatory — they are alerted if sender
 * becomes unresponsive.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  // ── Sender personal details ───────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [identificationNo, setIdentificationNo] = useState("");
  const [address, setAddress] = useState("");

  // ── Proof-of-life interval preference ────────────────────────────────────
  // How often the sender wants to be reminded to confirm they are alive
  const [confirmationIntervalDays, setConfirmationIntervalDays] = useState<30 | 60 | 90>(30);

  // ── Trusted contact details ───────────────────────────────────────────────
  // This person is alerted if sender does not respond to reminders
  // They never see memory content — only asked to confirm sender status
  const [trustedContactName, setTrustedContactName] = useState("");
  const [trustedContactNric, setTrustedContactNric] = useState("");
  const [trustedContactEmail, setTrustedContactEmail] = useState("");
  const [trustedContactPhone, setTrustedContactPhone] = useState("");

  // ── Verification document uploads ─────────────────────────────────────────
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);

  // ── Consent checkboxes ────────────────────────────────────────────────────
  // All 4 must be ticked before account can be created (PDPA requirement)
  const [consentDataCollection, setConsentDataCollection] = useState(false);
  const [consentLegacyDelivery, setConsentLegacyDelivery] = useState(false);
  const [consentReceiverContact, setConsentReceiverContact] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function onSubmit() {
    setError("");
    setInfo("");

    // 1) Validate sender personal details
    if (!name.trim() || !email.trim() || !password.trim()) {
      return setError("Name, email and password are required.");
    }
    if (!phoneNumber.trim() || !identificationNo.trim() || !address.trim()) {
      return setError("Phone number, NRIC and address are required.");
    }

    // 2) Validate trusted contact — all fields mandatory
    if (!trustedContactName.trim()) {
      return setError("Trusted contact name is required.");
    }
    if (!trustedContactNric.trim()) {
      return setError("Trusted contact NRIC is required.");
    }
    if (!trustedContactEmail.trim()) {
      return setError("Trusted contact email is required.");
    }
    if (!trustedContactPhone.trim()) {
      return setError("Trusted contact phone is required.");
    }

    // 3) Validate verification document
    if (!idFront) {
      return setError("Please upload your NRIC front image.");
    }

    // 4) Validate all 4 consent checkboxes — all must be ticked
    if (!consentDataCollection) {
      return setError("Please agree to data collection to continue.");
    }
    if (!consentLegacyDelivery) {
      return setError("Please agree to legacy delivery terms to continue.");
    }
    if (!consentReceiverContact) {
      return setError("Please agree to receiver contact consent to continue.");
    }
    if (!consentTerms) {
      return setError("Please agree to the Terms of Service and Privacy Policy to continue.");
    }

    setLoading(true);

    try {
      // Build form data to send to the API
      const form = new FormData();

      // Sender personal details
      form.append("name", name.trim());
      form.append("email", email.trim());
      form.append("password", password);
      form.append("phoneNumber", phoneNumber.trim());
      form.append("identificationNo", identificationNo.trim());
      form.append("address", address.trim());

      // Proof-of-life interval preference
      form.append("confirmationIntervalDays", String(confirmationIntervalDays));

      // Trusted contact details
      form.append("trustedContactName", trustedContactName.trim());
      form.append("trustedContactNric", trustedContactNric.trim());
      form.append("trustedContactEmail", trustedContactEmail.trim());
      form.append("trustedContactPhone", trustedContactPhone.trim());

      // Verification documents
      form.append("idFront", idFront);
      if (idBack) form.append("idBack", idBack);

      // Consent flags — sent as strings since FormData does not support booleans
      form.append("consentDataCollection", "true");
      form.append("consentLegacyDelivery", "true");
      form.append("consentReceiverContact", "true");
      form.append("consentTerms", "true");

      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Registration failed. Please try again.");
        return;
      }

      setInfo("Account created successfully. Awaiting admin verification. Redirecting...");

      setTimeout(() => {
        router.push("/login");
      }, 1200);

    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Create your Time Bridge account</h1>

      <p style={{ color: "#666", marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
        Time Bridge safely delivers your personal messages to your loved ones
        when the time comes. All fields below are required.
      </p>

      <div style={{ marginTop: 24, display: "grid", gap: 12 }}>

        {/* ── Section: Personal details ── */}
        <div style={{ fontWeight: 900, fontSize: 15, marginTop: 8 }}>
          Your details
        </div>

        <input
          placeholder="Full name (as on NRIC) *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Email address *"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password *"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          placeholder="Singapore phone number *"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        <input
          placeholder="NRIC / identification number *"
          value={identificationNo}
          onChange={(e) => setIdentificationNo(e.target.value)}
        />

        <input
          placeholder="Full residential address *"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        {/* ── Section: Proof-of-life interval ── */}
        <div style={{ fontWeight: 900, fontSize: 15, marginTop: 8 }}>
          Proof-of-life reminder frequency
        </div>

        <div style={{ color: "#666", fontSize: 13, lineHeight: 1.6 }}>
          How often would you like to receive a reminder to confirm you are well?
          If you do not respond, your trusted contact will be alerted.
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {([30, 60, 90] as const).map((days) => (
            <label
              key={days}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                padding: "8px 16px",
                border: `1px solid ${confirmationIntervalDays === days ? "#1D9E75" : "#ddd"}`,
                borderRadius: 8,
                background: confirmationIntervalDays === days ? "#f0fdf8" : "white",
              }}
            >
              <input
                type="radio"
                name="confirmationInterval"
                checked={confirmationIntervalDays === days}
                onChange={() => setConfirmationIntervalDays(days)}
              />
              Every {days} days
            </label>
          ))}
        </div>

        {/* ── Section: Trusted contact ── */}
        <div style={{ fontWeight: 900, fontSize: 15, marginTop: 8 }}>
          Trusted contact
        </div>

        <div style={{ color: "#666", fontSize: 13, lineHeight: 1.6 }}>
          Your trusted contact is someone who knows you personally — a spouse,
          sibling, or close friend. They will be alerted if you stop responding
          to our reminders. They will never see your messages — only asked to
          confirm your status.
        </div>

        <input
          placeholder="Trusted contact full name *"
          value={trustedContactName}
          onChange={(e) => setTrustedContactName(e.target.value)}
        />

        <input
          placeholder="Trusted contact NRIC *"
          value={trustedContactNric}
          onChange={(e) => setTrustedContactNric(e.target.value)}
        />

        <input
          placeholder="Trusted contact email *"
          type="email"
          value={trustedContactEmail}
          onChange={(e) => setTrustedContactEmail(e.target.value)}
        />

        <input
          placeholder="Trusted contact phone *"
          value={trustedContactPhone}
          onChange={(e) => setTrustedContactPhone(e.target.value)}
        />

        {/* ── Section: Verification documents ── */}
        <div style={{ fontWeight: 900, fontSize: 15, marginTop: 8 }}>
          Identity verification
        </div>

        <div style={{ color: "#666", fontSize: 13, lineHeight: 1.6 }}>
          Upload a photo of your NRIC or other government-issued ID.
          Front image is required. Back image is optional but recommended.
          Accepted formats: JPG, PNG, WebP. Maximum 5MB per image.
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>
            Front image *
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
            Back image (optional)
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

        {/* ── Section: Consent checkboxes ── */}
        <div style={{ fontWeight: 900, fontSize: 15, marginTop: 8 }}>
          Your consent
        </div>

        <div style={{ color: "#666", fontSize: 13, lineHeight: 1.6 }}>
          Please read and agree to each item below. All four are required
          before your account can be created.
        </div>

        {/* Consent 1: Data collection */}
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={consentDataCollection}
            onChange={(e) => setConsentDataCollection(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "#444" }}>
            I understand that Time Bridge will securely store my personal
            information, messages, media files, and my receiver's details
            for the purpose of legacy message delivery.
          </span>
        </label>

        {/* Consent 2: Legacy delivery */}
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={consentLegacyDelivery}
            onChange={(e) => setConsentLegacyDelivery(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "#444" }}>
            I understand that if Time Bridge determines I am no longer able
            to confirm my activity, or upon the date I have set, my messages
            will be delivered to my chosen receiver. I accept full responsibility
            for the content I create.
          </span>
        </label>

        {/* Consent 3: Receiver contact */}
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={consentReceiverContact}
            onChange={(e) => setConsentReceiverContact(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "#444" }}>
            I confirm I have the right to provide my receiver's personal details
            including their NRIC, name, address, and contact information,
            and I consent to Time Bridge contacting that person on my behalf
            when the time comes.
          </span>
        </label>

        {/* Consent 4: Terms and Privacy Policy */}
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={consentTerms}
            onChange={(e) => setConsentTerms(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "#444" }}>
            I have read and agree to the{" "}
            <a href="/terms" style={{ color: "#1D9E75" }}>Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" style={{ color: "#1D9E75" }}>Privacy Policy</a>.
          </span>
        </label>

        {/* ── Error and success messages ── */}
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

        {/* ── Submit button ── */}
        <button
          onClick={onSubmit}
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        <button
          onClick={() => router.push("/login")}
          disabled={loading}
        >
          Already have an account? Log in
        </button>

      </div>
    </div>
  );
}
