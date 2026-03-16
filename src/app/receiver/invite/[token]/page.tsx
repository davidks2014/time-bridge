"use client";

/**
 * Page: /receiver/invite/[token]
 *
 * Purpose:
 * - Show invite details (sender + receiver)
 * - Prompt receiver to confirm they are the intended person
 * - Then continue to claim/register page
 *
 * Next.js 16:
 * - params is Promise, must unwrap via React.use(params)
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type InvitePayload = {
  token: string;
  receiverEmail: string;
  receiverName: string | null;
  senderName: string | null;
  senderEmail: string | null;
};

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();

  const { token } = React.use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState<InvitePayload | null>(null);

  async function loadInvite() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/receiver/invite/${token}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed to load invite.");
        setInvite(null);
        return;
      }

      setInvite(json.invite ?? null);
    } catch {
      setError("Network error loading invite.");
      setInvite(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div style={{ padding: 20, maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Memory Invitation</h1>

      {loading && <div style={{ marginTop: 12 }}>Loading invite...</div>}

      {!loading && error && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: "red" }}>{error}</div>
          <button style={{ marginTop: 10 }} onClick={loadInvite}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && invite && (
        <div
          style={{
            marginTop: 14,
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 18 }}>
            You received a message invitation.
          </div>

          <div style={{ marginTop: 10, color: "#555" }}>
            From:{" "}
            <b>
              {invite.senderName ? invite.senderName : "Sender"}{" "}
              {invite.senderEmail ? `(${invite.senderEmail})` : ""}
            </b>
          </div>

          <div style={{ marginTop: 8, color: "#555" }}>
            Intended receiver:{" "}
            <b>{invite.receiverName ? invite.receiverName : "Unnamed Receiver"}</b>
          </div>

          <div style={{ marginTop: 8, color: "#555" }}>
            Receiver email: <b>{invite.receiverEmail}</b>
          </div>

          <div
            style={{
              marginTop: 16,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 14,
              background: "#fafafa",
            }}
          >
            <div style={{ fontWeight: 900 }}>Confirmation</div>
            <div style={{ marginTop: 8, color: "#444" }}>
              Are you{" "}
              <b>{invite.receiverName ? invite.receiverName : "the correct receiver"}</b>?
            </div>
            <div style={{ marginTop: 6, color: "#666", fontSize: 13 }}>
              Please continue only if this invitation is meant for you.
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => router.push(`/receiver/invite/${token}/claim`)}
              style={{ fontWeight: 800 }}
            >
              Yes, I am the correct receiver
            </button>

            <button onClick={() => router.push("/login")}>
              I already have an account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}