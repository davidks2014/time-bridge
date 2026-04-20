/**
 * src/app/receiver/invite/[token]/link/page.tsx
 *
 * Purpose:
 * - Shown after a logged-in user follows an invite link
 * - Auto-links their existing account to the receiver record
 * - Verifies NRIC matches before linking
 */

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function InviteLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { token } = React.use(params);

  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/receiver/invite/${token}/link`);
      return;
    }

    if (status === "authenticated" && !linking && !success && !error) {
      performLink();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function performLink() {
    setLinking(true);
    setError("");

    try {
      const res = await fetch("/api/receiver/invite/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed to link your account. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/memory-received"), 2000);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLinking(false);
    }
  }

  if (status === "loading" || (status === "authenticated" && linking && !error)) {
    return (
      <div style={{ padding: 20, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Linking your account...
        </div>
        <div style={{ color: "#666", fontSize: 14 }}>
          Please wait while we verify and connect your memory.
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ padding: 20, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <div style={{
          padding: 24,
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#166534" }}>
            Memory linked successfully
          </div>
          <div style={{ marginTop: 8, color: "#166534", fontSize: 14, lineHeight: 1.6 }}>
            Your account has been connected. Redirecting you now...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, maxWidth: 480, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Could not link account</h1>
        <div style={{
          marginTop: 12,
          padding: "12px 16px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 8,
          color: "#991b1b",
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          {error}
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={performLink} disabled={linking}>
            Try again
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            style={{ background: "white", border: "1px solid #ddd", color: "#444" }}
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}
