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
  const { status, data: session } = useSession();

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

  async function resubmitVerification() {
    setError("");
    setInfo("");

    if (!idFront) {
      setError("Please upload a new front image.");
      return;
    }

    setResubmitting(true);

    try {
      const form = new FormData();
      form.append("idFront", idFront);
      if (idBack) form.append("idBack", idBack);

      const res = await fetch("/api/auth/resubmit-verification", {
        method: "POST",
        body: form,
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
      setInfo(
        "Verification documents resubmitted successfully. Please wait for admin approval."
      );
    } catch {
      setError("Network error.");
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

  if (status === "loading") return <div style={{ padding: 20 }}>Checking session...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900 }}>Pending Verification</h1>

      <div style={{ marginTop: 10, color: "#666" }}>
        Your account is created successfully, but it requires admin approval before you can access memories.
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={refresh} disabled={loading}>
          {loading ? "Checking..." : "Refresh status"}
        </button>

        <button onClick={() => signOut({ callbackUrl: "/login" })}>Logout</button>
      </div>

      {verificationStatus === "PENDING" && (
        <div
          style={{
            marginTop: 18,
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 900 }}>Status: PENDING</div>
          <div style={{ marginTop: 6, color: "#1e3a8a" }}>
            Your verification is still pending admin review.
          </div>
        </div>
      )}

      {verificationStatus === "REJECTED" && (
        <div
          style={{
            marginTop: 18,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 900, color: "#991b1b" }}>Status: REJECTED</div>
          <div style={{ marginTop: 8, color: "#7f1d1d" }}>
            Reason: <b>{rejectReason || "N/A"}</b>
          </div>

          <div style={{ marginTop: 14, fontWeight: 900 }}>Re-upload Verification Documents</div>
          <div style={{ marginTop: 6, color: "#666", fontSize: 13 }}>
            Please upload corrected front and back images, then submit again for admin review.
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Front image *</div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setIdFront(e.target.files?.[0] ?? null)}
              />
            </div>

            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Back image (optional)</div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setIdBack(e.target.files?.[0] ?? null)}
              />
            </div>

            <button onClick={resubmitVerification} disabled={resubmitting}>
              {resubmitting ? "Submitting..." : "Resubmit Verification"}
            </button>
          </div>
        </div>
      )}

      {info && <div style={{ marginTop: 14, color: "green" }}>{info}</div>}
      {error && <div style={{ marginTop: 14, color: "red" }}>{error}</div>}
    </div>
  );
}