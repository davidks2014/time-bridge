"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type InvitePayload = {
  token: string;
  receiverEmail: string;
  receiverName: string | null;
  senderName: string | null;
  senderEmail: string | null;
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

  const [confirmed, setConfirmed] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [identificationNo, setIdentificationNo] = useState("");

  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
  }, [token]);

  async function submitClaim() {
    setError("");
    setInfo("");

    if (!confirmed) return setError("Please confirm you are the correct receiver.");
    if (!email.trim()) return setError("Email is required.");
    if (!password.trim()) return setError("Password is required.");
    if (!identificationNo.trim()) return setError("Identification number is required.");
    if (!idFront) return setError("Front document required.");

    setSubmitting(true);

    try {
      const form = new FormData();
      form.append("token", token);
      form.append("email", email.trim());
      form.append("password", password);
      form.append("identificationNo", identificationNo.trim());
      form.append("idFront", idFront);
      if (idBack) form.append("idBack", idBack);

      const res = await fetch("/api/receiver/invite/claim", {
        method: "POST",
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed");
        return;
      }

      setInfo("Claim submitted. Waiting admin approval.");
      setTimeout(() => router.push("/login"), 900);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingInvite) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Claim Invite</h1>

      {error && !confirmed && (
        <div style={{ marginTop: 12, color: "red" }}>{error}</div>
      )}

      {!confirmed && invite && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 16,
            marginTop: 14,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 18 }}>
            Receiver Confirmation
          </div>

          <div style={{ marginTop: 10, color: "#444" }}>
            You received a message from <b>{invite.senderName ?? "Sender"}</b>
            {invite.senderEmail ? ` (${invite.senderEmail})` : ""}.
          </div>

          <div style={{ marginTop: 10, color: "#444" }}>
            Are you <b>{invite.receiverName ?? "the intended receiver"}</b>?
          </div>

          <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
            Continue only if this invitation is meant for you.
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              style={{ fontWeight: 800 }}
              onClick={() => setConfirmed(true)}
            >
              Yes, I am
            </button>

            <button
              type="button"
              onClick={() => router.push("/login")}
            >
              No, I am not the receiver
            </button>
          </div>
        </div>
      )}

      {confirmed && (
        <div
          style={{
            marginTop: 16,
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 18 }}>Create Your Account</div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <input
              placeholder="Identification No"
              value={identificationNo}
              onChange={(e) => setIdentificationNo(e.target.value)}
            />

            <div style={{ marginTop: 10 }}>
              <div style={{ marginBottom: 6, fontSize: 13, color: "#666" }}>
                Front ID image *
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setIdFront(e.target.files?.[0] ?? null)}
              />
              {idFront ? (
                <div style={{ marginTop: 6, fontSize: 12, color: "green" }}>
                  Selected: {idFront.name}
                </div>
              ) : null}
            </div>

            <div>
              <div style={{ marginBottom: 6, fontSize: 13, color: "#666" }}>
                Back ID image
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setIdBack(e.target.files?.[0] ?? null)}
              />
              {idBack ? (
                <div style={{ marginTop: 6, fontSize: 12, color: "green" }}>
                  Selected: {idBack.name}
                </div>
              ) : null}
            </div>

            {error && <div style={{ color: "red" }}>{error}</div>}
            {info && <div style={{ color: "green" }}>{info}</div>}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              <button onClick={submitClaim} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </button>

              <button
                type="button"
                onClick={() => setConfirmed(false)}
                disabled={submitting}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}