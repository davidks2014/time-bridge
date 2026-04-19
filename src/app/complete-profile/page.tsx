/**
 * src/app/complete-profile/page.tsx
 *
 * Purpose:
 * - Shown to Google users after their first login
 * - They need to provide NRIC, phone, address to complete their profile
 * - Without this, they cannot create memories
 * - After completing, they go through admin verification like normal users
 */

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CompleteProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [identificationNo, setIdentificationNo] = useState("");
  const [address, setAddress] = useState("");
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);

  // Consent checkboxes — required for PDPA compliance
  const [consentDataCollection, setConsentDataCollection] = useState(false);
  const [consentLegacyDelivery, setConsentLegacyDelivery] = useState(false);
  const [consentReceiverContact, setConsentReceiverContact] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // If profile is already complete, redirect to dashboard
  useEffect(() => {
    if (status === "authenticated") {
      const profileComplete = (session?.user as any)?.profileComplete;
      if (profileComplete) router.push("/dashboard");
    }
  }, [status, session, router]);

  async function onSubmit() {
    setError("");
    setInfo("");

    // Validate required fields
    if (!phoneNumber.trim()) return setError("Phone number is required.");
    if (!identificationNo.trim()) return setError("NRIC is required.");
    if (!address.trim()) return setError("Address is required.");
    if (!idFront) return setError("Please upload your NRIC front image.");

    // Validate all consents
    if (!consentDataCollection) return setError("Please agree to data collection.");
    if (!consentLegacyDelivery) return setError("Please agree to legacy delivery terms.");
    if (!consentReceiverContact) return setError("Please agree to receiver contact consent.");
    if (!consentTerms) return setError("Please agree to the Terms of Service.");

    setLoading(true);

    try {
      const form = new FormData();
      form.append("phoneNumber", phoneNumber.trim());
      form.append("identificationNo", identificationNo.trim());
      form.append("address", address.trim());
      form.append("idFront", idFront);
      if (idBack) form.append("idBack", idBack);
      form.append("consentDataCollection", "true");
      form.append("consentLegacyDelivery", "true");
      form.append("consentReceiverContact", "true");
      form.append("consentTerms", "true");

      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed to save profile. Please try again.");
        return;
      }

      setInfo("Profile completed successfully. Redirecting...");

      // Force session refresh so the JWT token picks up the new profile data
      // Without this, the dashboard still shows the old incomplete state
      await fetch("/api/auth/session?update", { method: "GET" });

      // Small delay to allow session to refresh
      setTimeout(() => router.push("/pending-verification"), 1500);

    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900 }}>Complete your profile</h1>

      <p style={{ color: "#666", marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
        Welcome to Time Bridge. To create and deliver legacy messages,
        we need a few more details to verify your identity.
      </p>

      <div style={{ marginTop: 24, display: "grid", gap: 12 }}>

        <div style={{ fontWeight: 900, fontSize: 15 }}>Your details</div>

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

        <div style={{ fontWeight: 900, fontSize: 15, marginTop: 8 }}>
          Identity verification
        </div>

        <div style={{ color: "#666", fontSize: 13 }}>
          Upload a photo of your NRIC. Front is required, back is optional.
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
        </div>

        <div style={{ fontWeight: 900, fontSize: 15, marginTop: 8 }}>
          Your consent
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={consentDataCollection}
            onChange={(e) => setConsentDataCollection(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "#444" }}>
            I understand that Time Bridge will securely store my personal
            information and my receiver's details for legacy message delivery.
          </span>
        </label>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={consentLegacyDelivery}
            onChange={(e) => setConsentLegacyDelivery(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "#444" }}>
            I understand my messages will be delivered to my chosen receiver
            upon the conditions I set. I accept responsibility for my content.
          </span>
        </label>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={consentReceiverContact}
            onChange={(e) => setConsentReceiverContact(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "#444" }}>
            I confirm I have the right to provide my receiver's personal details
            and consent to Time Bridge contacting them on my behalf.
          </span>
        </label>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={consentTerms}
            onChange={(e) => setConsentTerms(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "#444" }}>
            I agree to the Terms of Service and Privacy Policy.
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

        <button onClick={onSubmit} disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Saving..." : "Complete profile"}
        </button>

      </div>
    </div>
  );
}
