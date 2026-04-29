"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLogo from "@/components/TimeBridgeLogo";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

export default function CompleteProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep]         = useState(1);
  const [loading, setLoading]           = useState(false);
  const [submittingMessage, setSubmittingMessage] = useState("");
  const [error, setError]               = useState("");

  // Fields
  const [idNo, setIdNo]         = useState("");
  const [phone, setPhone]       = useState("");
  const [address, setAddress]   = useState("");
  const [idFront, setIdFront]   = useState<File | null>(null);
  const [idBack, setIdBack]     = useState<File | null>(null);
  const [consents, setConsents] = useState({
    dataStorage: false,
    identity: false,
    legacy: false,
    terms: false,
  });

  const fileRef  = useRef<HTMLInputElement>(null);
  const fileRef2 = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") return <TimeBridgeLoading message="Just a moment..." />;

  const allConsents = Object.values(consents).every(Boolean);

  function validateStep1() {
    if (!idNo.trim())    { setError("NRIC is required."); return false; }
    if (idNo.length < 7) { setError("Please enter a valid NRIC."); return false; }
    if (!phone.trim())   { setError("Phone number is required."); return false; }
    if (!address.trim()) { setError("Address is required."); return false; }
    return true;
  }

  function validateStep2() {
    if (!idFront) { setError("Please upload your NRIC front image."); return false; }
    return true;
  }

  function validateStep3() {
    if (!allConsents) { setError("Please agree to all consent statements."); return false; }
    return true;
  }

  function goNext() {
    setError("");
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => s + 1);
  }

  async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width  = img.width  * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file);
        }, "image/jpeg", 0.8);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  async function uploadDocumentToB2(file: File): Promise<string> {
    const compressed = await compressImage(file);
    const signRes = await fetch("/api/media/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType: "DOCUMENT", fileName: compressed.name, contentType: compressed.type }),
    });
    if (!signRes.ok) throw new Error("Failed to get upload URL.");
    const { uploadUrl, cdnUrl } = await signRes.json();

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": compressed.type },
      body: compressed,
    });
    if (!uploadRes.ok) throw new Error("Failed to upload document to storage.");

    return cdnUrl as string;
  }

  async function submit() {
    setError("");
    if (!validateStep3()) return;
    if (!idFront) { setError("Please upload your NRIC front image."); return; }

    setLoading(true);
    try {
      setSubmittingMessage("Uploading documents securely...");
      const verificationDocFrontUrl = await uploadDocumentToB2(idFront);
      const verificationDocBackUrl  = idBack ? await uploadDocumentToB2(idBack) : null;

      setSubmittingMessage("Saving your profile...");
      const res  = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identificationNo:       idNo.trim().toUpperCase(),
          phoneNumber:            phone.trim(),
          address:                address.trim(),
          verificationDocFrontUrl,
          verificationDocBackUrl,
          consentDataCollection:  consents.dataStorage,
          consentLegacyDelivery:  consents.legacy,
          consentReceiverContact: consents.identity,
          consentTerms:           consents.terms,
        }),
      });
      const json = await res.json();

      if (!res.ok) { setError(json?.error ?? "Submission failed. Please try again."); return; }

      setSubmittingMessage("Almost done...");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Network error. Please try again.");
    } finally {
      setLoading(false);
      setSubmittingMessage("");
    }
  }

  const steps = [
    { num: 1, label: "Details" },
    { num: 2, label: "Identity" },
    { num: 3, label: "Consent" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--ivory)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "32px 20px 48px",
    }}>

      {/* Background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `radial-gradient(ellipse at 80% 20%, rgba(139,105,20,0.04) 0%, transparent 50%)`,
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 480 }}>

        {/* Logo */}
        <div className="tb-fade-in" style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <TimeBridgeLogo size="sm" variant="light" showWordmark={false} animated={false} />
        </div>

        {/* Header */}
        <div className="tb-fade-in tb-stagger-1" style={{ textAlign: "center", marginBottom: 28 }}>
          <h2 style={{ marginBottom: 8 }}>Complete your profile</h2>
          <p style={{ fontSize: 13, color: "var(--earth-muted)", lineHeight: 1.7 }}>
            Welcome, <strong>{session?.user?.name}</strong>. Before you can create memories,
            we need to verify your identity. This keeps Time Bridge safe and trustworthy.
          </p>
        </div>

        {/* Step indicator */}
        <div className="tb-card tb-fade-in tb-stagger-2" style={{ padding: "20px 24px", marginBottom: 20 }}>

          {/* Steps */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
            {steps.map((s, i) => (
              <div key={s.num} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "unset" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 32, height: 32,
                    borderRadius: "50%",
                    background: step > s.num ? "var(--sage)" : step === s.num ? "var(--gold)" : "var(--parchment)",
                    border: `2px solid ${step > s.num ? "var(--sage)" : step === s.num ? "var(--gold)" : "var(--border-dark)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: step >= s.num ? "var(--ivory)" : "var(--earth-muted)",
                    transition: "all var(--transition)",
                    flexShrink: 0,
                  }}>
                    {step > s.num ? "✓" : s.num}
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: step === s.num ? "var(--gold)" : step > s.num ? "var(--sage)" : "var(--earth-muted)",
                    letterSpacing: "0.5px",
                    display: "none",
                  }}
                  className="step-label-desktop">
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: 1,
                    background: step > s.num ? "var(--sage-light)" : "var(--border)",
                    margin: "0 8px",
                    transition: "background var(--transition)",
                  }} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="tb-banner tb-banner-error" style={{ marginBottom: 20 }}>
              <div className="tb-banner-dot tb-banner-dot-red" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Step 1: Personal details ── */}
          {step === 1 && (
            <div className="tb-fade-in">
              <div className="tb-section-label" style={{ marginBottom: 16 }}>Personal details</div>

              <div className="tb-field">
                <label className="tb-label">NRIC / identification number *</label>
                <input
                  className="tb-input"
                  placeholder="e.g. S1234567A"
                  value={idNo}
                  onChange={(e) => setIdNo(e.target.value.toUpperCase())}
                  autoComplete="off"
                />
                <span style={{ fontSize: 11, color: "var(--earth-muted)" }}>
                  Singapore NRIC, FIN, or other national ID
                </span>
              </div>

              <div className="tb-field">
                <label className="tb-label">Phone number *</label>
                <input
                  className="tb-input"
                  type="tel"
                  placeholder="e.g. 91234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>

              <div className="tb-field">
                <label className="tb-label">Residential address *</label>
                <input
                  className="tb-input"
                  placeholder="Block, street, unit number, postal code"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  autoComplete="street-address"
                />
              </div>

              <div style={{
                padding: "12px 16px",
                background: "var(--sage-pale)",
                border: "1px solid var(--sage-light)",
                borderRadius: "var(--radius-sm)",
                fontSize: 12,
                color: "#2A4A2A",
                lineHeight: 1.6,
              }}>
                Your NRIC and address are stored securely and used only for identity verification. This is required by Singapore law for legacy message services.
              </div>
            </div>
          )}

          {/* ── Step 2: Identity documents ── */}
          {step === 2 && (
            <div className="tb-fade-in">
              <div className="tb-section-label" style={{ marginBottom: 8 }}>Identity verification</div>
              <p style={{ fontSize: 13, color: "var(--earth-muted)", marginBottom: 20, lineHeight: 1.6 }}>
                Please upload a clear photo of your NRIC. This is reviewed by our team to confirm your identity before your account is approved.
              </p>

              {/* Front */}
              <div className="tb-field">
                <label className="tb-label">NRIC front *</label>
                {idFront ? (
                  <div style={{
                    padding: "12px 16px",
                    background: "var(--sage-pale)",
                    border: "1px solid var(--sage-light)",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 13,
                  }}>
                    <span style={{ color: "var(--earth-mid)" }}>🪪 {idFront.name}</span>
                    <button onClick={() => setIdFront(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--earth-muted)", fontSize: 18, lineHeight: 1 }}>×</button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      width: "100%",
                      background: "var(--ivory)",
                      border: "2px dashed var(--border-dark)",
                      borderRadius: "var(--radius-md)",
                      padding: "28px 20px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      transition: "all var(--transition)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--gold-light)";
                      e.currentTarget.style.background = "var(--gold-pale)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-dark)";
                      e.currentTarget.style.background = "var(--ivory)";
                    }}
                  >
                    <span style={{ fontSize: 28 }}>📷</span>
                    <span style={{ fontSize: 13, color: "var(--earth-muted)", fontWeight: 700 }}>Upload NRIC front</span>
                    <span style={{ fontSize: 11, color: "var(--earth-muted)" }}>JPG, PNG or WebP — max 5MB</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => setIdFront(e.target.files?.[0] ?? null)} />
              </div>

              {/* Back */}
              <div className="tb-field">
                <label className="tb-label">NRIC back (optional)</label>
                {idBack ? (
                  <div style={{
                    padding: "12px 16px",
                    background: "var(--sage-pale)",
                    border: "1px solid var(--sage-light)",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 13,
                  }}>
                    <span style={{ color: "var(--earth-mid)" }}>🪪 {idBack.name}</span>
                    <button onClick={() => setIdBack(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--earth-muted)", fontSize: 18, lineHeight: 1 }}>×</button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef2.current?.click()}
                    style={{
                      width: "100%",
                      background: "var(--ivory)",
                      border: "1px dashed var(--border-dark)",
                      borderRadius: "var(--radius-md)",
                      padding: "16px",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "var(--earth-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      minHeight: 48,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--gold-light)"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-dark)"}
                  >
                    + Upload NRIC back
                  </button>
                )}
                <input ref={fileRef2} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => setIdBack(e.target.files?.[0] ?? null)} />
              </div>
            </div>
          )}

          {/* ── Step 3: Consent ── */}
          {step === 3 && (
            <div className="tb-fade-in">
              <div className="tb-section-label" style={{ marginBottom: 16 }}>Consent & agreement</div>
              <p style={{ fontSize: 13, color: "var(--earth-muted)", marginBottom: 20, lineHeight: 1.6 }}>
                Please read and agree to all of the following before we submit your profile for review.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  {
                    key: "dataStorage" as const,
                    text: "I consent to Time Bridge storing my personal information (name, NRIC, address, phone) for the purpose of identity verification and legacy message delivery.",
                  },
                  {
                    key: "identity" as const,
                    text: "I confirm that the identity documents I have uploaded are genuine and belong to me. I understand that providing false documents is a criminal offence.",
                  },
                  {
                    key: "legacy" as const,
                    text: "I understand that Time Bridge will hold my legacy messages securely and release them to my designated receivers according to the conditions I set.",
                  },
                  {
                    key: "terms" as const,
                    text: "I agree to the Time Bridge Terms of Service and Privacy Policy, and acknowledge that I have read and understood the PDPA data handling practices.",
                  },
                ].map((item) => (
                  <label key={item.key} className="tb-checkbox-label" style={{
                    padding: "12px 14px",
                    background: consents[item.key] ? "var(--sage-pale)" : "var(--ivory)",
                    border: `1px solid ${consents[item.key] ? "var(--sage-light)" : "var(--border)"}`,
                    borderRadius: "var(--radius-sm)",
                    transition: "all var(--transition)",
                    cursor: "pointer",
                  }}>
                    <input
                      type="checkbox"
                      checked={consents[item.key]}
                      onChange={(e) => setConsents((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                    />
                    <span style={{ fontSize: 12, lineHeight: 1.6, color: "var(--earth-mid)" }}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            {step > 1 && (
              <button
                className="tb-btn tb-btn-outline"
                onClick={() => { setError(""); setStep((s) => s - 1); }}
                style={{ flex: 1, fontSize: 12 }}
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                className="tb-btn tb-btn-primary"
                onClick={goNext}
                style={{ flex: 2, fontSize: 12, letterSpacing: "1px" }}
              >
                Continue →
              </button>
            ) : (
              <button
                className="tb-btn tb-btn-gold"
                onClick={submit}
                disabled={loading || !allConsents}
                style={{ flex: 2, fontSize: 12, letterSpacing: "1px" }}
              >
                {loading ? (submittingMessage || "Submitting...") : "Submit for verification"}
              </button>
            )}
          </div>
        </div>

        {/* Trust badge */}
        <div className="tb-fade-in tb-stagger-3" style={{
          textAlign: "center",
          fontSize: 11,
          color: "var(--earth-muted)",
          lineHeight: 1.7,
          padding: "0 20px",
        }}>
          🔒 Your data is encrypted and stored securely in Singapore.<br />
          Time Bridge complies with the Personal Data Protection Act (PDPA).
        </div>

      </div>
    </div>
  );
}
