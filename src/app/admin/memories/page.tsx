/**
 * src/app/admin/memories/page.tsx
 *
 * Purpose:
 * - Admin views all memory collections across all users
 * - Filter by status — ALL / DRAFT / RELEASED / VIEWED
 * - See sender proof-of-life stage
 * - See receiver claim status
 */

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type MemoryItem = {
  id: string;
  title: string;
  status: string;
  releaseDate: string | null;
  releasedAt: string | null;
  viewedAt: string | null;
};

type Collection = {
  id: string;
  title: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
    verificationStatus: string;
    proofOfLifeStage: string;
  };
  receiver: {
    id: string;
    fullName: string;
    identificationNo: string;
    email: string | null;
    receiverType: string;
    isClaimed: boolean;
  };
  items: MemoryItem[];
  totalItems: number;
  releasedItems: number;
  viewedItems: number;
};

const proofStageColor = (stage: string) => {
  if (stage === "NORMAL") return { bg: "#f0fdf8", text: "#065f46" };
  if (stage === "WARNING") return { bg: "#fffbeb", text: "#92400e" };
  if (stage === "CRITICAL") return { bg: "#fef2f2", text: "#991b1b" };
  return { bg: "#f9fafb", text: "#6b7280" };
};

export default function AdminMemoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "DRAFT" | "RELEASED" | "VIEWED">("ALL");

  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      if (role && role !== "ADMIN") router.replace("/dashboard");
      else loadMemories();
    }
  }, [status, role, filter]);

  async function loadMemories() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/memories?status=${filter}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to load memories.");
        return;
      }
      setCollections(json.collections ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || loading) {
    return <div style={{ padding: 20 }}>Loading memories...</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>

      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Memory Oversight</h1>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
            {collections.length} collections shown
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/admin")}>Back to admin</button>
          <button onClick={loadMemories}>Refresh</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["ALL", "DRAFT", "RELEASED", "VIEWED"] as const).map((f) => (
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
            {f}
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

      {collections.length === 0 && (
        <div style={{ color: "#6b7280", padding: 20, textAlign: "center" }}>
          No memories found for this filter.
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {collections.map((col) => {
          const proofColors = proofStageColor(col.sender.proofOfLifeStage);
          const allReleased = col.releasedItems === col.totalItems && col.totalItems > 0;
          const someReleased = col.releasedItems > 0;

          return (
            <div key={col.id} style={{
              border: `1px solid ${allReleased ? "#6ee7b7" : someReleased ? "#fde68a" : "#e5e7eb"}`,
              borderRadius: 14,
              padding: 16,
              background: allReleased ? "#f0fdf8" : someReleased ? "#fffbeb" : "white",
            }}>

              {/* Collection title and status */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 8,
              }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>
                    {col.title}
                  </div>
                  <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
                    Created: {new Date(col.createdAt).toLocaleDateString("en-SG")}
                  </div>
                </div>

                {/* Release status badge */}
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: allReleased ? "#dcfce7" : someReleased ? "#fef3c7" : "#f3f4f6",
                  color: allReleased ? "#166534" : someReleased ? "#92400e" : "#6b7280",
                }}>
                  {col.releasedItems}/{col.totalItems} released
                  {col.viewedItems > 0 && ` · ${col.viewedItems} viewed`}
                </div>
              </div>

              {/* Sender and receiver info */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginTop: 12,
              }}>
                {/* Sender */}
                <div style={{
                  padding: "10px 12px",
                  background: proofColors.bg,
                  borderRadius: 8,
                  fontSize: 13,
                }}>
                  <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>
                    Sender
                  </div>
                  <div style={{ color: "#374151" }}>{col.sender.name}</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>{col.sender.email}</div>
                  <div style={{
                    marginTop: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: proofColors.text,
                  }}>
                    Proof-of-life: {col.sender.proofOfLifeStage}
                  </div>
                </div>

                {/* Receiver */}
                <div style={{
                  padding: "10px 12px",
                  background: col.receiver.isClaimed ? "#f0fdf8" : "#f9fafb",
                  borderRadius: 8,
                  fontSize: 13,
                }}>
                  <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>
                    Receiver
                  </div>
                  <div style={{ color: "#374151" }}>{col.receiver.fullName}</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    {col.receiver.identificationNo} · {col.receiver.receiverType}
                  </div>
                  <div style={{
                    marginTop: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: col.receiver.isClaimed ? "#166534" : "#92400e",
                  }}>
                    {col.receiver.isClaimed ? "✓ Claimed" : "Not yet claimed"}
                  </div>
                </div>
              </div>

              {/* Memory items */}
              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {col.items.map((item) => (
                  <div key={item.id} style={{
                    padding: "8px 12px",
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {item.status === "RELEASED" && (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "#dcfce7",
                          color: "#166534",
                        }}>
                          Released {item.releasedAt
                            ? new Date(item.releasedAt).toLocaleDateString("en-SG")
                            : ""}
                        </span>
                      )}
                      {item.status === "DRAFT" && item.releaseDate && (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "#f3f4f6",
                          color: "#6b7280",
                        }}>
                          Releases {new Date(item.releaseDate).toLocaleDateString("en-SG")}
                        </span>
                      )}
                      {item.viewedAt && (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "#eff6ff",
                          color: "#1e40af",
                        }}>
                          Viewed {new Date(item.viewedAt).toLocaleDateString("en-SG")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
