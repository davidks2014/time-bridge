/**
 * src/app/guardian/page.tsx
 *
 * Purpose:
 * - Guardian portal — shows all children's memories the user is holding
 * - Guardian can initiate handover to the child's email
 * - When child has grown up and is ready to receive their memory directly
 */

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type GuardianMemory = {
  receiverId: string;
  receiverName: string;
  receiverNric: string;
  receiverType: string;
  collections: {
    id: string;
    title: string;
    senderName: string;
    itemCount: number;
    releasedAt: string | null;
  }[];
};

export default function GuardianPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [memories, setMemories] = useState<GuardianMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Per-receiver handover form state
  const [handingOver, setHandingOver] = useState<string | null>(null); // receiverId
  const [childEmail, setChildEmail] = useState("");
  const [childName, setChildName] = useState("");
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [handoverError, setHandoverError] = useState("");
  const [handoverSuccess, setHandoverSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      loadGuardianMemories();
    }
  }, [status]);

  async function loadGuardianMemories() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/guardian/memories");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to load memories.");
        return;
      }
      setMemories(json.memories ?? []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function initiateHandover(receiverId: string) {
    setHandoverError("");
    setHandoverSuccess("");

    if (!childEmail.trim()) {
      return setHandoverError("Please enter the child's email address.");
    }
    if (!childName.trim()) {
      return setHandoverError("Please enter the child's name.");
    }

    setHandoverLoading(true);
    try {
      const res = await fetch("/api/guardian/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, childEmail: childEmail.trim(), childName: childName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setHandoverError(json?.error ?? "Handover failed. Please try again.");
        return;
      }
      setHandoverSuccess(json.message ?? "Handover initiated successfully.");
      setHandingOver(null);
      setChildEmail("");
      setChildName("");
      // Reload to reflect changes
      setTimeout(() => loadGuardianMemories(), 1500);
    } catch {
      setHandoverError("Network error. Please try again.");
    } finally {
      setHandoverLoading(false);
    }
  }

  function openHandover(memory: GuardianMemory) {
    setHandingOver(memory.receiverId);
    setChildEmail("");
    setChildName(memory.receiverName);
    setHandoverError("");
    setHandoverSuccess("");
  }

  function cancelHandover() {
    setHandingOver(null);
    setChildEmail("");
    setChildName("");
    setHandoverError("");
    setHandoverSuccess("");
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
        <p style={{ color: "#666" }}>Loading guardian portal...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            background: "none",
            border: "none",
            color: "#1D9E75",
            cursor: "pointer",
            padding: 0,
            fontSize: 14,
          }}
        >
          ← Back to dashboard
        </button>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 900, marginTop: 12 }}>Guardian Portal</h1>
      <p style={{ color: "#666", fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>
        You are holding memories on behalf of the following receivers.
        When they are ready to receive their memories directly, initiate a handover below.
      </p>

      {error && (
        <div style={{
          marginTop: 16,
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

      {handoverSuccess && (
        <div style={{
          marginTop: 16,
          padding: "10px 14px",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 8,
          color: "#166534",
          fontSize: 13,
        }}>
          {handoverSuccess}
        </div>
      )}

      {!loading && memories.length === 0 && !error && (
        <div style={{
          marginTop: 24,
          padding: 16,
          background: "#f9fafb",
          border: "1px solid #eee",
          borderRadius: 12,
          color: "#6b7280",
          fontSize: 14,
        }}>
          You are not currently holding any memories as a guardian.
        </div>
      )}

      <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
        {memories.map((memory) => (
          <div
            key={memory.receiverId}
            style={{
              border: "1px solid #d1fae5",
              borderRadius: 12,
              padding: 16,
              background: "#f0fdf8",
            }}
          >
            {/* Receiver header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, color: "#065f46" }}>
                  {memory.receiverName}
                </div>
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                  NRIC: {memory.receiverNric} &middot; Type: {memory.receiverType}
                </div>
              </div>
              {handingOver !== memory.receiverId && (
                <button
                  onClick={() => openHandover(memory)}
                  style={{
                    background: "#1D9E75",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Hand over
                </button>
              )}
            </div>

            {/* Collections */}
            {memory.collections.length > 0 && (
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {memory.collections.map((col) => (
                  <div
                    key={col.id}
                    style={{
                      padding: "10px 12px",
                      background: "#fff",
                      border: "1px solid #a7f3d0",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#065f46" }}>
                      {col.title}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                      From: {col.senderName} &middot; {col.itemCount} memory item{col.itemCount !== 1 ? "s" : ""}
                    </div>
                    {col.releasedAt && (
                      <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                        Released: {new Date(col.releasedAt).toLocaleDateString("en-SG")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {memory.collections.length === 0 && (
              <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 8 }}>
                No released memories yet.
              </div>
            )}

            {/* Handover form */}
            {handingOver === memory.receiverId && (
              <div style={{
                marginTop: 16,
                padding: 14,
                background: "#fff",
                border: "1px solid #fde68a",
                borderRadius: 10,
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#92400e", marginBottom: 10 }}>
                  Initiate handover to {memory.receiverName}
                </div>
                <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
                  The child will receive an email invitation to create an account and claim their memories.
                  You will no longer be their guardian after they claim.
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <input
                    placeholder="Child's full name"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                  />
                  <input
                    type="email"
                    placeholder="Child's email address"
                    value={childEmail}
                    onChange={(e) => setChildEmail(e.target.value)}
                  />

                  {handoverError && (
                    <div style={{
                      padding: "8px 12px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: 8,
                      color: "#991b1b",
                      fontSize: 13,
                    }}>
                      {handoverError}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => initiateHandover(memory.receiverId)}
                      disabled={handoverLoading}
                      style={{
                        background: "#1D9E75",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 16px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: handoverLoading ? "not-allowed" : "pointer",
                        flex: 1,
                      }}
                    >
                      {handoverLoading ? "Sending invite..." : "Send handover invite"}
                    </button>
                    <button
                      onClick={cancelHandover}
                      disabled={handoverLoading}
                      style={{
                        background: "#f3f4f6",
                        color: "#374151",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        padding: "10px 16px",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

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
        As a guardian, you hold memories on behalf of a child receiver.
        You do not have access to read the memory content — only the sender can see it.
        When the child is ready, initiate a handover to transfer the memory to them directly.
      </div>
    </div>
  );
}
