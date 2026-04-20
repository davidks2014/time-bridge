/**
 * src/app/claim/page.tsx
 *
 * Purpose:
 * - Self-claim page — receiver proactively searches for memories
 * - Receiver enters their NRIC to find released memories waiting for them
 * - Does NOT reveal memory content — only shows that something exists
 * - After finding a match, guides receiver to verify identity
 *
 * This handles cases where:
 * - The invite email was never received (bounced, wrong address)
 * - A guardian brings a child to claim their memory
 * - A receiver heard about Time Bridge from family
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PendingMemory = {
  collectionId: string;
  collectionTitle: string;
  senderName: string;
  receiverName: string;
  receiverId: string;
  inviteToken: string | null;
  releasedAt: string;
};

export default function SelfClaimPage() {
  const router = useRouter();

  // Step 1 — NRIC search
  const [nric, setNric] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Step 2 — Results
  const [pendingMemories, setPendingMemories] = useState<PendingMemory[]>([]);
  const [searched, setSearched] = useState(false);

  async function searchByNric() {
    setSearchError("");
    setPendingMemories([]);
    setSearched(false);

    const normalizedNric = nric.trim().toUpperCase();

    if (!normalizedNric) {
      return setSearchError("Please enter your NRIC or identification number.");
    }

    if (normalizedNric.length < 6) {
      return setSearchError("Please enter a valid NRIC or identification number.");
    }

    setSearching(true);

    try {
      const res = await fetch("/api/claim/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificationNo: normalizedNric }),
      });

      const json = await res.json();

      if (!res.ok) {
        setSearchError(json?.error ?? "Search failed. Please try again.");
        return;
      }

      setPendingMemories(json.memories ?? []);
      setSearched(true);

    } catch {
      setSearchError("Network error. Please check your connection.");
    } finally {
      setSearching(false);
    }
  }

  function handleClaim(memory: PendingMemory) {
    // If there is an invite token, go to the invite claim page
    if (memory.inviteToken) {
      router.push(`/receiver/invite/${memory.inviteToken}/claim`);
      return;
    }

    // No invite token — go to the manual claim flow
    router.push(`/claim/verify?receiverId=${memory.receiverId}&collectionId=${memory.collectionId}`);
  }

  return (
    <div style={{ padding: 20, maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900 }}>Claim your memory</h1>

      <p style={{ color: "#666", marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
        Someone may have left a personal message for you on Time Bridge.
        Enter your NRIC or identification number to find out.
      </p>

      {/* ── NRIC search ── */}
      <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
        <input
          placeholder="NRIC / identification number"
          value={nric}
          onChange={(e) => setNric(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchByNric()}
          style={{ textTransform: "uppercase" }}
        />

        {searchError && (
          <div style={{
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            color: "#991b1b",
            fontSize: 13,
          }}>
            {searchError}
          </div>
        )}

        <button onClick={searchByNric} disabled={searching}>
          {searching ? "Searching..." : "Search for my memory"}
        </button>

        <button onClick={() => router.push("/login")}>
          I already have an account — log in
        </button>
      </div>

      {/* ── No results ── */}
      {searched && pendingMemories.length === 0 && (
        <div style={{
          marginTop: 24,
          padding: 16,
          background: "#f9fafb",
          border: "1px solid #eee",
          borderRadius: 12,
        }}>
          <div style={{ fontWeight: 700, color: "#374151" }}>
            No memories found
          </div>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
            We did not find any released memories for NRIC <b>{nric.toUpperCase()}</b>.
            This could mean:
          </div>
          <ul style={{ color: "#6b7280", fontSize: 13, marginTop: 8, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>No one has left a memory for you yet</li>
            <li>The memory has not been released yet</li>
            <li>The sender used a different NRIC for you</li>
          </ul>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>
            If you believe there should be a memory for you, please contact our support team.
          </div>
        </div>
      )}

      {/* ── Results found ── */}
      {pendingMemories.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}>
            {pendingMemories.length === 1
              ? "1 memory is waiting for you"
              : `${pendingMemories.length} memories are waiting for you`}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {pendingMemories.map((memory) => (
              <div
                key={memory.collectionId}
                style={{
                  padding: 16,
                  background: "#f0fdf8",
                  border: "1px solid #6ee7b7",
                  borderRadius: 12,
                }}
              >
                <div style={{ fontWeight: 700, color: "#065f46" }}>
                  A personal message has been left for {memory.receiverName}
                </div>
                <div style={{ color: "#047857", fontSize: 13, marginTop: 6 }}>
                  From: <b>{memory.senderName}</b>
                </div>
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                  Released: {new Date(memory.releasedAt).toLocaleDateString("en-SG")}
                </div>

                {/* Important — never show content, only show it exists */}
                <div style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#92400e",
                }}>
                  You will be able to read this message after verifying your identity.
                </div>

                <button
                  onClick={() => handleClaim(memory)}
                  style={{ marginTop: 12, width: "100%" }}
                >
                  Verify my identity and claim this memory
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Privacy note ── */}
      <div style={{
        marginTop: 32,
        padding: "10px 14px",
        background: "#f9fafb",
        border: "1px solid #eee",
        borderRadius: 8,
        fontSize: 12,
        color: "#9ca3af",
        lineHeight: 1.6,
      }}>
        Your NRIC is used only to search for memories addressed to you.
        It is not stored from this search. Time Bridge complies with PDPA.
      </div>
    </div>
  );
}
