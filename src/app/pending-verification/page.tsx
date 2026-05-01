"use client";

/**
 * Page: /pending-verification
 *
 * Purpose:
 * - Users with verificationStatus = PENDING should land here after login
 * - If REJECTED:
 *   - show reject reason
 *   - allow re-upload of verification documents
 *   - resubmit for admin review
 *
 * Admin:
 * - If admin somehow lands here, redirect to admin dashboard
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

type MeResponse = {
  user: {
    role: "USER" | "ADMIN";
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
    rejectReason: string | null;
  };
};

export default function PendingVerificationPage() {
  const router = useRouter();
  const { status, data: session, update } = useSession();

  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  const [verificationStatus, setVerificationStatus] = useState<
    "PENDING" | "APPROVED" | "REJECTED" | ""
  >("");
  const [rejectReason, setRejectReason] = useState("");

  // Reupload files
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [resubmitting, setResubmitting] = useState(false);

  async function refresh() {
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const res = await fetch("/api/me");
      const json = (await res.json()) as Partial<MeResponse>;

      if (!res.ok) {
        setError((json as any)?.error ?? "Failed to load status.");
        return;
      }

      const role = json.user?.role;
      const v = json.user?.verificationStatus ?? "";
      const rr = json.user?.rejectReason ?? "";

      setVerificationStatus(v as "PENDING" | "APPROVED" | "REJECTED" | "");
      setRejectReason(rr);

      if (role === "ADMIN") {
        router.push("/admin/verification");
        return;
      }

      if (v === "APPROVED") {
        router.push("/dashboard");
        return;
      }

      if (v === "REJECTED") {
        setError(`Your verification was rejected. Reason: ${rr || "N/A"}`);
        return;
      }

      setInfo("Still pending. Please wait for admin approval.");
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
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

  async function resubmitVerification() {
    setError("");
    setInfo("");

    if (!idFront) {
      setError("Please upload a new front image.");
      return;
    }

    setResubmitting(true);

    try {
      const frontUrl = await uploadDocumentToB2(idFront);
      const backUrl  = idBack ? await uploadDocumentToB2(idBack) : null;

      const res = await fetch("/api/auth/resubmit-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frontUrl, backUrl }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed to resubmit verification.");
        return;
      }

      setVerificationStatus("PENDING");
      setRejectReason("");
      setIdFront(null);
      setIdBack(null);
      setError("");
      setInfo("Verification documents resubmitted successfully. Please wait for admin approval.");
      await update();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Network error.");
    } finally {
      setResubmitting(false);
    }
  }

  // Protect route
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // If admin somehow lands here, redirect
  useEffect(() => {
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role === "ADMIN") {
        router.replace("/admin/verification");
      }
    }
  }, [status, session, router]);

  // Load current status on page load
  useEffect(() => {
    if (status === "authenticated") {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status === "loading") return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #E8D5B7", borderTopColor: "#B8965A", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const firstName = session?.user?.name?.split(" ")[0] ?? "friend";

  return (
    <div style={{ background: "#FAF7F2", minHeight: "100vh", fontFamily: "Lato, sans-serif" }}>
      <style>{`@keyframes tb-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>

        {verificationStatus === "REJECTED" ? (
          <>
            {/* Icon */}
            <div style={{ width: 80, height: 80, borderRadius: 20, background: "rgba(220,38,38,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>

            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", color: "#DC2626", marginBottom: 16 }}>VERIFICATION UNSUCCESSFUL</div>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 36, fontWeight: 400, color: "#2C1810", lineHeight: 1.25, marginBottom: 16 }}>Your verification was not approved.</div>

            {/* Reject reason */}
            <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, padding: "16px 20px", margin: "0 auto 28px", maxWidth: 480, textAlign: "left" }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", color: "#DC2626", marginBottom: 8 }}>REASON FOR REJECTION</div>
              <div style={{ fontSize: 14, color: "#2C1810", lineHeight: 1.6 }}>{rejectReason || "No reason provided."}</div>
            </div>

            <div style={{ fontSize: 16, color: "#888", lineHeight: 1.7, fontWeight: 300, margin: "0 auto 28px", maxWidth: 440 }}>Please re-upload your verification documents.</div>

            {/* Upload box */}
            <div style={{ background: "#fff", border: "1px solid rgba(184,150,90,0.2)", borderRadius: 16, padding: "24px 28px", margin: "0 auto 24px", maxWidth: 480, textAlign: "left" }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#2C1810", marginBottom: 8, display: "block" }}>Front image *</label>
              <div style={{ border: "1.5px dashed rgba(184,150,90,0.4)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, background: "#FAF7F2" }}>
                <input type="file" accept="image/*" style={{ width: "100%", fontSize: 13 }} onChange={(e) => setIdFront(e.target.files?.[0] ?? null)} />
              </div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#2C1810", marginBottom: 8, display: "block" }}>Back image (optional)</label>
              <div style={{ border: "1.5px dashed rgba(184,150,90,0.4)", borderRadius: 10, padding: "12px 16px", background: "#FAF7F2" }}>
                <input type="file" accept="image/*" style={{ width: "100%", fontSize: 13 }} onChange={(e) => setIdBack(e.target.files?.[0] ?? null)} />
              </div>
            </div>

            <button
              onClick={resubmitVerification}
              disabled={resubmitting}
              style={{ width: "100%", maxWidth: 440, background: "#2C1810", color: "#FAF7F2", border: "none", borderRadius: 10, padding: "16px", fontSize: 15, fontWeight: 700, cursor: resubmitting ? "not-allowed" : "pointer", opacity: resubmitting ? 0.7 : 1, letterSpacing: "0.06em" }}
            >
              {resubmitting ? "Submitting..." : "Resubmit for review →"}
            </button>
            <div style={{ fontSize: 12, color: "rgba(184,150,90,0.65)", marginTop: 12 }}>Make sure your NRIC is clearly visible and not blurry</div>
            <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ fontSize: 13, color: "#B8965A", background: "none", border: "none", cursor: "pointer", marginTop: 20, display: "block", fontWeight: 600, width: "100%" }}>Sign out</button>
          </>
        ) : (
          <>
            {/* Icon */}
            <div style={{ width: 80, height: 80, borderRadius: 20, background: "rgba(124,154,126,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7C9A7E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>

            {/* Pulsing badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,154,126,0.12)", border: "1px solid rgba(124,154,126,0.3)", borderRadius: 20, padding: "8px 16px", marginBottom: 24 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C9A7E", animation: "tb-pulse 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", color: "#7C9A7E" }}>VERIFICATION IN PROGRESS</span>
            </div>

            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", color: "#B8965A", marginBottom: 16 }}>YOUR PROFILE IS BEING REVIEWED</div>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 36, fontWeight: 400, color: "#2C1810", lineHeight: 1.25, marginBottom: 16 }}>You are almost there, {firstName}.</div>
            <div style={{ fontSize: 16, color: "#888", lineHeight: 1.85, fontWeight: 300, maxWidth: 440, margin: "0 auto 28px" }}>Our team is reviewing your verification documents. This usually takes less than 24 hours. We will notify you by email once approved.</div>

            {/* Info box */}
            <div style={{ background: "#fff", border: "1px solid rgba(184,150,90,0.2)", borderRadius: 16, padding: "24px 28px", margin: "0 auto 28px", maxWidth: 480, textAlign: "left" }}>
              {[
                {
                  icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C9A7E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.09 6.09l.86-1.35a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15z"/></svg>),
                  title: "What happens next?",
                  subtitle: "Once approved, you will receive an email and can immediately start creating memories for your loved ones.",
                },
                {
                  icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C9A7E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>),
                  title: "Check your email",
                  subtitle: "We will send a notification to your registered email address the moment your account is approved.",
                },
              ].map((row, i, arr) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: i < arr.length - 1 ? 16 : 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(124,154,126,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {row.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#2C1810", marginBottom: 4 }}>{row.title}</div>
                    <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>{row.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={refresh}
              disabled={loading}
              style={{ width: "100%", maxWidth: 440, background: "#7C9A7E", color: "#FAF7F2", border: "none", borderRadius: 10, padding: "16px", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, letterSpacing: "0.06em" }}
            >
              {loading ? "Checking..." : "Check my verification status"}
            </button>
            <div style={{ fontSize: 12, color: "rgba(184,150,90,0.65)", marginTop: 12 }}>Most accounts are approved within 24 hours</div>
            <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ fontSize: 13, color: "#B8965A", background: "none", border: "none", cursor: "pointer", marginTop: 20, display: "block", fontWeight: 600, width: "100%" }}>Sign out</button>
          </>
        )}

        {error && <div style={{ fontSize: 13, color: "#DC2626", marginTop: 16, textAlign: "center" }}>{error}</div>}
        {info && <div style={{ fontSize: 13, color: "#7C9A7E", marginTop: 16, textAlign: "center" }}>{info}</div>}
      </div>
    </div>
  );
}