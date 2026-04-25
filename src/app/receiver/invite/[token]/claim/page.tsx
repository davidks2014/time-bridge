"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import TimeBridgeLogo from "@/components/TimeBridgeLogo";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type InviteData = {
  receiverName: string;
  senderName: string;
  collectionTitle: string;
  memoryCount: number;
  alreadyClaimed: boolean;
};

export default function ClaimInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token  = params?.token as string;

  const [invite, setInvite]   = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  // Form fields
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [idNo, setIdNo]           = useState("");
  const [phone, setPhone]         = useState("");
  const [address, setAddress]     = useState("");
  const [consent, setConsent]     = useState(false);
  const [idFront, setIdFront]     = useState<File | null>(null);
  const [idBack, setIdBack]       = useState<File | null>(null);
  const fileRef  = useRef<HTMLInputElement>(null);
  const fileRef2 = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [declining, setDeclining]   = useState(false);

  useEffect(() => {
    if (token) loadInvite();
  }, [token]);

  async function loadInvite() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/receiver/invite/${token}`);
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Invalid or expired invite link."); return; }
      setInvite(json);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    setError("");
    if (!email.trim())          { setError("Email is required."); return; }
    if (password.length < 8)    { setError("Password must be at least 8 characters."); return; }
    if (!idNo.trim())           { setError("NRIC is required."); return; }
    if (!phone.trim())          { setError("Phone number is required."); return; }
    if (!address.trim())        { setError("Address is required."); return; }
    if (!idFront)               { setError("Please upload your NRIC front image."); return; }
    if (!consent)               { setError("Please agree to the consent statement."); return; }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("email",            email.trim());
      form.append("password",         password);
      form.append("identificationNo", idNo.trim().toUpperCase());
      form.append("phoneNumber",      phone.trim());
      form.append("address",          address.trim());
      form.append("inviteToken",      token);
      form.append("consentAgreed",    "true");
      form.append("idFront",          idFront);
      if (idBack) form.append("idBack", idBack);

      const res  = await fetch(`/api/receiver/invite/${token}/claim`, { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Claim failed. Please try again."); return; }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function decline() {
    setDeclining(true);
    try {
      await fetch(`/api/receiver/invite/${token}/decline`, { method: "POST" });
      router.push("/");
    } catch {
      setDeclining(false);
    }
  }

  if (loading) return <TimeBridgeLoading message="Opening your invitation..." />;

  // Success state
  if (submitted) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--ivory)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
      }}>
        <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>💌</div>
          <h2 style={{ marginBottom: 12 }}>Claim submitted</h2>
          <p style={{ fontSize: 14, color: "var(--earth-muted)", lineHeight: 1.7, marginBottom: 24 }}>
            Our team will verify your identity within 1–2 business days. Once approved, you will be able to access the memory left for you.
          </p>
          <div style={{
            padding: "16px 20px",
            background: "var(--sage-pale)",
            border: "1px solid var(--sage-light)",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            color: "#2A4A2A",
            lineHeight: 1.6,
          }}>
            Check your email <strong>{email}</strong> — we will notify you when verification is complete.
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !invite) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--ivory)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
      }}>
        <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
          <h2 style={{ marginBottom: 12 }}>Invalid invitation</h2>
          <p style={{ fontSize: 14, color: "var(--earth-muted)", lineHeight: 1.7, marginBottom: 24 }}>
            {error}
          </p>
          <button className="tb-btn tb-btn-outline" onClick={() => router.push("/claim")}>
            Try searching by NRIC instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--ivory)",
      padding: "32px 20px 48px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>

      {/* Background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `radial-gradient(ellipse at 20% 30%, rgba(92,122,92,0.05) 0%, transparent 50%)`,
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 480 }}>

        {/* Logo */}
        <div className="tb-fade-in" style={{ display: "flex", justifyContent: "center", marginBottom: 28, cursor: "pointer" }}
             onClick={() => router.push("/login")}>
          <TimeBridgeLogo size="sm" variant="light" showWordmark animated />
        </div>

        {/* Invitation card */}
        <div className="tb-envelope-card tb-fade-in tb-stagger-1" style={{ marginBottom: 20 }}>

          {/* Envelope icon */}
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
            <svg width="64" height="50" viewBox="0 0 72 56">
              <rect x="1" y="1" width="70" height="54" rx="5" fill="#F5E8D0" stroke="#C4A060" strokeWidth="1.5"/>
              <path d="M1 1 L36 30 L71 1" stroke="#8B6914" strokeWidth="1.5" fill="#EDD8B8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1 55 L26 32" stroke="#C4A060" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
              <path d="M71 55 L46 32" stroke="#C4A060" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
              <path d="M36 52 C36 52 29 47 29 43 C29 41 30.5 39.5 32.5 39.5 C34 39.5 35.5 41 36 42 C36.5 41 38 39.5 39.5 39.5 C41.5 39.5 43 41 43 43 C43 47 36 52 36 52Z" fill="#8B6914"/>
            </svg>
          </div>

          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 400,
            color: "var(--earth)",
            marginBottom: 8,
            lineHeight: 1.4,
          }}>
            A message has been left for you
          </div>

          <div style={{ fontSize: 14, color: "var(--earth-muted)", marginBottom: 16, lineHeight: 1.6 }}>
            <strong style={{ color: "var(--earth-mid)" }}>{invite?.senderName}</strong> has left a personal memory
            for <strong style={{ color: "var(--earth-mid)" }}>{invite?.receiverName}</strong>.
          </div>

          <div style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 4,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 300, color: "var(--gold)" }}>
                {invite?.memoryCount}
              </div>
              <div style={{ fontSize: 11, color: "var(--earth-muted)", letterSpacing: "0.5px" }}>
                {invite?.memoryCount === 1 ? "message" : "messages"}
              </div>
            </div>
          </div>
        </div>

        {/* Already claimed */}
        {invite?.alreadyClaimed ? (
          <div className="tb-card tb-fade-in tb-stagger-2" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--sage)", marginBottom: 8 }}>
              Already claimed
            </div>
            <p style={{ fontSize: 13, color: "var(--earth-muted)", marginBottom: 20 }}>
              This memory has already been claimed. Sign in to view it.
            </p>
            <button className="tb-btn tb-btn-sage tb-btn-full" onClick={() => router.push("/login")}>
              Sign in to view
            </button>
          </div>
        ) : (
          /* Registration form */
          <div className="tb-card tb-fade-in tb-stagger-2" style={{ padding: "24px" }}>
            <div className="tb-section-label" style={{ marginBottom: 16 }}>Verify your identity to claim</div>

            {error && (
              <div className="tb-banner tb-banner-error">
                <div className="tb-banner-dot tb-banner-dot-red" />
                <span>{error}</span>
              </div>
            )}

            <div className="tb-field">
              <label className="tb-label">Email address</label>
              <input className="tb-input" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>

            <div className="tb-field">
              <label className="tb-label">Password (min 8 characters)</label>
              <input className="tb-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </div>

            <div className="tb-field">
              <label className="tb-label">NRIC / identification number</label>
              <input className="tb-input" placeholder="e.g. S9585504J" value={idNo} onChange={(e) => setIdNo(e.target.value.toUpperCase())} />
            </div>

            <div className="tb-field">
              <label className="tb-label">Phone number</label>
              <input className="tb-input" type="tel" placeholder="91234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="tb-field">
              <label className="tb-label">Residential address</label>
              <input className="tb-input" placeholder="Block, street, unit, postal code" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            {/* ID upload */}
            <div className="tb-field">
              <label className="tb-label">NRIC front image *</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {idFront ? (
                  <div style={{
                    padding: "10px 14px",
                    background: "var(--sage-pale)",
                    border: "1px solid var(--sage-light)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}>
                    <span style={{ color: "var(--earth-mid)" }}>🪪 {idFront.name}</span>
                    <button onClick={() => setIdFront(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--earth-muted)", fontSize: 16 }}>×</button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      background: "var(--ivory)",
                      border: "1px dashed var(--border-dark)",
                      borderRadius: "var(--radius-sm)",
                      padding: "12px",
                      cursor: "pointer",
                      color: "var(--earth-muted)",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      minHeight: 44,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--gold-light)"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-dark)"}
                  >
                    + Upload NRIC front image
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => setIdFront(e.target.files?.[0] ?? null)} />
              </div>
            </div>

            <div className="tb-field">
              <label className="tb-label">NRIC back image (optional)</label>
              {idBack ? (
                <div style={{
                  padding: "10px 14px",
                  background: "var(--sage-pale)",
                  border: "1px solid var(--sage-light)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <span style={{ color: "var(--earth-mid)" }}>🪪 {idBack.name}</span>
                  <button onClick={() => setIdBack(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--earth-muted)", fontSize: 16 }}>×</button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef2.current?.click()}
                  style={{
                    background: "var(--ivory)",
                    border: "1px dashed var(--border-dark)",
                    borderRadius: "var(--radius-sm)",
                    padding: "12px",
                    cursor: "pointer",
                    color: "var(--earth-muted)",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    minHeight: 44,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--gold-light)"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-dark)"}
                >
                  + Upload NRIC back image
                </button>
              )}
              <input ref={fileRef2} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => setIdBack(e.target.files?.[0] ?? null)} />
            </div>

            {/* Consent */}
            <label className="tb-checkbox-label" style={{ marginBottom: 20 }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span style={{ fontSize: 13, color: "var(--earth-muted)", lineHeight: 1.6 }}>
                I confirm I am the intended recipient of this memory and consent to Time Bridge storing my details to verify my identity. I understand my information will be reviewed by an administrator.
              </span>
            </label>

            <button
              className="tb-btn tb-btn-gold tb-btn-full"
              onClick={submit}
              disabled={submitting}
              style={{ marginBottom: 10, fontSize: 12, letterSpacing: "1px" }}
            >
              {submitting ? "Submitting..." : "Claim this memory 💌"}
            </button>

            <button
              className="tb-btn tb-btn-ghost tb-btn-full"
              onClick={decline}
              disabled={declining}
              style={{ fontSize: 12, color: "var(--earth-muted)" }}
            >
              {declining ? "Declining..." : "This memory is not for me"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
