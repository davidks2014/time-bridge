/**
 * src/app/claim/verify/page.tsx
 *
 * Purpose:
 * - Manual verification flow when no invite token exists
 * - Receiver fills in their details and uploads NRIC
 * - Creates account and links to receiver record
 * - Admin verifies and approves
 */

"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const receiverId = searchParams.get("receiverId") ?? "";
  const collectionId = searchParams.get("collectionId") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [identificationNo, setIdentificationNo] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [consentAgreed, setConsentAgreed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function onSubmit() {
    setError("");
    setInfo("");

    if (!email.trim()) return setError("Email is required.");
    if (!password.trim() || password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }
    if (!identificationNo.trim()) return setError("NRIC is required.");
    if (!phoneNumber.trim()) return setError("Phone number is required.");
    if (!address.trim()) return setError("Address is required.");
    if (!idFront) return setError("Please upload your NRIC front image.");
    if (!consentAgreed) return setError("Please agree to the consent statement.");

    setLoading(true);

    try {
      const form = new FormData();
      form.append("email", email.trim());
      form.append("password", password);
      form.append("identificationNo", identificationNo.trim().toUpperCase());
      form.append("phoneNumber", phoneNumber.trim());
      form.append("address", address.trim());
      form.append("receiverId", receiverId);
      form.append("collectionId", collectionId);
      form.append("idFront", idFront);
      if (idBack) form.append("idBack", idBack);
      form.append("consentAgreed", "true");

      const res = await fetch("/api/claim/verify", {
        method: "POST",
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Verification failed. Please try again.");
        return;
      }

      setInfo("Claim submitted. Our team will verify your identity within 1-2 business days. Redirecting to login...");
      setTimeout(() => router.push("/login"), 2500);

    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900 }}>Verify your identity</h1>

      <p style={{ color: "#666", marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
        To claim your memory, we need to verify that you are the intended
        recipient. Please create an account and upload your NRIC.
      </p>

      <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
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
          onChange={(e) => setIdentificationNo(e.target.value.toUpperCase())}
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

        <div style={{ fontWeight: 900, fontSize: 15, marginTop: 4 }}>
          Identity verification
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
        </div>

        <label style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          cursor: "pointer",
        }}>
          <input
            type="checkbox"
            checked={consentAgreed}
            onChange={(e) => setConsentAgreed(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "#444" }}>
            I confirm I am the intended recipient of this memory and consent
            to Time Bridge storing my details to verify my identity.
          </span>
        </label>

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

        <button onClick={onSubmit} disabled={loading}>
          {loading ? "Submitting..." : "Submit verification"}
        </button>

        <button onClick={() => router.back()}>
          Back
        </button>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
      <VerifyForm />
    </Suspense>
  );
}
