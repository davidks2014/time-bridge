/**
 * src/app/admin/receivers/page.tsx
 *
 * Purpose:
 * - Admin views all receivers
 * - See delivery status, claim status
 * - Generate claim codes directly from UI
 * - Filter by claimed/unclaimed/failed delivery
 */

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type DeliveryAttempt = {
  channel: string;
  status: string;
  attemptedAt: string;
};

type Collection = {
  id: string;
  title: string;
  totalItems: number;
  releasedItems: number;
  latestReleasedAt: string | null;
};

type Receiver = {
  id: string;
  fullName: string;
  identificationNo: string;
  email: string | null;
  phone: string | null;
  address: string;
  receiverType: string;
  isClaimed: boolean;
  linkedUser: { name: string; email: string } | null;
  guardianName: string | null;
  guardianEmail: string | null;
  senderName: string | null;
  senderEmail: string | null;
  createdAt: string;
  collections: Collection[];
  lastDeliveryAttempt: DeliveryAttempt | null;
  hasActiveInvite: boolean;
};

export default function AdminReceiversPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "UNCLAIMED" | "CLAIMED" | "FAILED">("ALL");

  // Claim code generation
  const [generatingCode, setGeneratingCode] = useState<string | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<Record<string, string>>({});
  const [codeError, setCodeError] = useState("");

  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      if (role && role !== "ADMIN") router.replace("/dashboard");
      else loadReceivers();
    }
  }, [status, role]);

  async function loadReceivers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/receivers");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to load receivers.");
        return;
      }
      setReceivers(json.receivers ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function generateClaimCode(receiverId: string) {
    setCodeError("");
    setGeneratingCode(receiverId);
    try {
      const res = await fetch("/api/admin/claim-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCodeError(json?.error ?? "Failed to generate claim code.");
        return;
      }
      setGeneratedCodes((prev) => ({ ...prev, [receiverId]: json.claimCode }));
    } catch {
      setCodeError("Network error.");
    } finally {
      setGeneratingCode(null);
    }
  }

  const filtered = receivers.filter((r) => {
    if (filter === "UNCLAIMED") return !r.isClaimed && r.collections.some((c) => c.releasedItems > 0);
    if (filter === "CLAIMED") return r.isClaimed;
    if (filter === "FAILED") return r.lastDeliveryAttempt?.status === "FAILED";
    return true;
  });

  if (status === "loading" || loading) {
    return <div style={{ padding: 20 }}>Loading receivers...</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Receiver Management</h1>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
            {receivers.length} total receivers
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/admin")}>Back to admin</button>
          <button onClick={loadReceivers}>Refresh</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["ALL", "UNCLAIMED", "CLAIMED", "FAILED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? "#1D9E75" : "white",
              color: filter === f ? "white" : "#374151",
              border: `1px solid ${filter === f ? "#1D9E75" : "#e5e7eb"}`,
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {f === "ALL" ? `All (${receivers.length})`
              : f === "UNCLAIMED" ? `Unclaimed (${receivers.filter(r => !r.isClaimed && r.collections.some(c => c.releasedItems > 0)).length})`
              : f === "CLAIMED" ? `Claimed (${receivers.filter(r => r.isClaimed).length})`
              : `Failed Delivery (${receivers.filter(r => r.lastDeliveryAttempt?.status === "FAILED").length})`}
          </button>
        ))}
      </div>

      {error && (
        <div style={{
          padding: "10px 14px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 8,
          color: "#991b1b",
          fontSize: 13,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {codeError && (
        <div style={{
          padding: "10px 14px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 8,
          color: "#991b1b",
          fontSize: 13,
          marginBottom: 16,
        }}>
          {codeError}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ color: "#6b7280", padding: 20, textAlign: "center" }}>
          No receivers found for this filter.
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((receiver) => {
          const hasReleased = receiver.collections.some((c) => c.releasedItems > 0);
          const generatedCode = generatedCodes[receiver.id];

          return (
            <div key={receiver.id} style={{
              border: `1px solid ${!receiver.isClaimed && hasReleased ? "#fde68a" : "#e5e7eb"}`,
              borderRadius: 14,
              padding: 16,
              background: !receiver.isClaimed && hasReleased ? "#fffbeb" : "white",
            }}>
              {/* Top row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>
                    {receiver.fullName}
                    <span style={{
                      marginLeft: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: receiver.isClaimed ? "#dcfce7" : hasReleased ? "#fef3c7" : "#f3f4f6",
                      color: receiver.isClaimed ? "#166534" : hasReleased ? "#92400e" : "#6b7280",
                    }}>
                      {receiver.isClaimed ? "✓ Claimed" : hasReleased ? "Awaiting claim" : "No release yet"}
                    </span>
                    <span style={{
                      marginLeft: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "#f3f4f6",
                      color: "#6b7280",
                    }}>
                      {receiver.receiverType}
                    </span>
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
                    NRIC: {receiver.identificationNo} · {receiver.email ?? "No email"}
                  </div>
                  <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
                    Sender: {receiver.senderName ?? "Unknown"} ({receiver.senderEmail})
                  </div>
                </div>

                {/* Delivery status badge */}
                {receiver.lastDeliveryAttempt && (
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 8,
                    background: receiver.lastDeliveryAttempt.status === "DELIVERED" || receiver.lastDeliveryAttempt.status === "SENT"
                      ? "#dcfce7" : receiver.lastDeliveryAttempt.status === "FAILED"
                      ? "#fef2f2" : "#f3f4f6",
                    color: receiver.lastDeliveryAttempt.status === "DELIVERED" || receiver.lastDeliveryAttempt.status === "SENT"
                      ? "#166534" : receiver.lastDeliveryAttempt.status === "FAILED"
                      ? "#991b1b" : "#6b7280",
                  }}>
                    Last delivery: {receiver.lastDeliveryAttempt.channel} — {receiver.lastDeliveryAttempt.status}
                  </div>
                )}
              </div>

              {/* Collections */}
              {receiver.collections.length > 0 && (
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  {receiver.collections.map((col) => (
                    <div key={col.id} style={{
                      padding: "8px 12px",
                      background: "#f9fafb",
                      borderRadius: 8,
                      fontSize: 13,
                      color: "#374151",
                    }}>
                      <b>{col.title}</b> — {col.releasedItems}/{col.totalItems} released
                      {col.latestReleasedAt && (
                        <span style={{ color: "#9ca3af", marginLeft: 8 }}>
                          Released: {new Date(col.latestReleasedAt).toLocaleDateString("en-SG")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Linked user */}
              {receiver.isClaimed && receiver.linkedUser && (
                <div style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "#166534",
                }}>
                  Claimed by: <b>{receiver.linkedUser.name}</b> ({receiver.linkedUser.email})
                </div>
              )}

              {/* Claim code section — only for unclaimed receivers with released memories */}
              {!receiver.isClaimed && hasReleased && (
                <div style={{ marginTop: 12 }}>
                  {generatedCode ? (
                    <div style={{
                      padding: "10px 14px",
                      background: "#f0fdf8",
                      border: "1px solid #6ee7b7",
                      borderRadius: 8,
                    }}>
                      <div style={{ fontWeight: 700, color: "#065f46", fontSize: 13 }}>
                        Claim code generated
                      </div>
                      <div style={{
                        fontSize: 22,
                        fontWeight: 900,
                        letterSpacing: 3,
                        color: "#047857",
                        marginTop: 4,
                      }}>
                        {generatedCode}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: 11, marginTop: 4 }}>
                        Valid for 90 days. Give this code to the receiver during your visit.
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(generatedCode)}
                        style={{ marginTop: 8, fontSize: 12 }}
                      >
                        Copy code
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => generateClaimCode(receiver.id)}
                      disabled={generatingCode === receiver.id}
                      style={{
                        background: "#1D9E75",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 16px",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {generatingCode === receiver.id ? "Generating..." : "Generate claim code"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
