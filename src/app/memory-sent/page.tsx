"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type MemoryItem = {
  id: string;
  title: string;
  status: "DRAFT" | "RELEASED";
  releaseDate: string | null;
  releasedAt: string | null;
};

type Memory = {
  id: string;
  title: string;
  createdAt: string;
  receiver: {
    fullName: string;
    identificationNo: string;
    receiverType: string;
    linkedUserId: string | null;
  };
  items: MemoryItem[];
};

export default function MemorySentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<"ALL" | "DRAFT" | "RELEASED">("ALL");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") loadMemories();
  }, [status]);

  async function loadMemories() {
    setLoading(true);
    try {
      const res  = await fetch("/api/memory-sent");
      const json = await res.json();
      setMemories(json.memories ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || loading) {
    return <TimeBridgeLoading message="Loading your memories..." />;
  }

  const filtered = memories.filter((m) => {
    if (filter === "DRAFT")    return m.items.every((i) => i.status === "DRAFT");
    if (filter === "RELEASED") return m.items.some((i)  => i.status === "RELEASED");
    return true;
  });

  const counts = {
    all:      memories.length,
    draft:    memories.filter((m) => m.items.every((i) => i.status === "DRAFT")).length,
    released: memories.filter((m) => m.items.some((i)  => i.status === "RELEASED")).length,
  };

  return (
    <div className="tb-page tb-page-with-tabs">
      <div className="tb-container" style={{ paddingTop: 32, paddingBottom: 48 }}>

        {/* Header */}
        <div className="tb-page-header tb-fade-in">
          <h1>Memories sent</h1>
          <p style={{ color: "var(--earth-muted)", fontSize: 14, marginTop: 6 }}>
            {memories.length} {memories.length === 1 ? "memory" : "memories"} created for your loved ones
          </p>
        </div>

        {/* Filter tabs */}
        <div className="tb-fade-in tb-stagger-1" style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {(["ALL", "DRAFT", "RELEASED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${filter === f ? "var(--gold-light)" : "var(--border-dark)"}`,
                background: filter === f ? "var(--gold-pale)" : "var(--ivory)",
                color: filter === f ? "var(--gold)" : "var(--earth-muted)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.5px",
                transition: "all var(--transition)",
                minHeight: 36,
              }}
            >
              {f === "ALL" ? `All (${counts.all})` : f === "DRAFT" ? `Draft (${counts.draft})` : `Released (${counts.released})`}
            </button>
          ))}
        </div>

        {/* Memory list */}
        {filtered.length === 0 ? (
          <div className="tb-empty tb-fade-in">
            <div style={{ fontSize: 40, marginBottom: 16 }}>💌</div>
            <div className="tb-empty-title">
              {filter === "ALL" ? "No memories yet" : `No ${filter.toLowerCase()} memories`}
            </div>
            <div className="tb-empty-body">
              {filter === "ALL"
                ? "Go to your dashboard to create your first memory."
                : `You have no ${filter.toLowerCase()} memories at this time.`}
            </div>
            {filter === "ALL" && (
              <button
                className="tb-btn tb-btn-gold"
                onClick={() => router.push("/dashboard")}
                style={{ marginTop: 20 }}
              >
                Go to dashboard
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((memory, i) => {
              const allReleased  = memory.items.every((item) => item.status === "RELEASED");
              const someReleased = memory.items.some((item)  => item.status === "RELEASED");
              const isClaimed    = !!memory.receiver.linkedUserId;

              const nextRelease = memory.items
                .filter((item) => item.status === "DRAFT" && item.releaseDate)
                .sort((a, b) => new Date(a.releaseDate!).getTime() - new Date(b.releaseDate!).getTime())[0];

              const latestRelease = memory.items
                .filter((item) => item.releasedAt)
                .sort((a, b) => new Date(b.releasedAt!).getTime() - new Date(a.releasedAt!).getTime())[0];

              return (
                <div
                  key={memory.id}
                  className={`tb-memory-card tb-fade-in ${allReleased ? "released" : "draft"}`}
                  style={{ animationDelay: `${0.05 * i}s` }}
                  onClick={() => router.push(`/memory-sent/${memory.id}`)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title */}
                      <div style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 19,
                        fontWeight: 500,
                        color: "var(--earth)",
                        marginBottom: 6,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {memory.title}
                      </div>

                      {/* Receiver */}
                      <div style={{ fontSize: 13, color: "var(--earth-muted)", lineHeight: 1.6 }}>
                        For <strong style={{ color: "var(--earth-mid)" }}>{memory.receiver.fullName}</strong>
                        <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
                        <span style={{ fontSize: 12 }}>{memory.receiver.identificationNo}</span>
                      </div>

                      {/* Meta */}
                      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                        {nextRelease?.releaseDate && !allReleased && (
                          <span style={{ fontSize: 11, color: "var(--earth-muted)" }}>
                            📅 Releases {new Date(nextRelease.releaseDate).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                        {latestRelease?.releasedAt && (
                          <span style={{ fontSize: 11, color: "var(--sage)" }}>
                            ✓ Released {new Date(latestRelease.releasedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                        {isClaimed && (
                          <span style={{ fontSize: 11, color: "var(--sage)", fontWeight: 700 }}>
                            ✓ Claimed by recipient
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "var(--earth-muted)" }}>
                          {memory.receiver.receiverType === "CHILD" ? "👶 Child" : memory.receiver.receiverType === "UNKNOWN" ? "📍 No contact yet" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Status + arrow */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span className={`tb-badge ${allReleased ? "tb-badge-released" : someReleased ? "tb-badge-pending" : "tb-badge-draft"}`}>
                        {allReleased ? "Released" : someReleased ? "Partial" : "Draft"}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--earth-muted)" strokeWidth="2" strokeLinecap="round"><polyline points="9,18 15,12 9,6"/></svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
