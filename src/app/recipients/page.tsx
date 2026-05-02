"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

/**
 * Page: /recipients
 * Purpose: Paginated list of all recipients with inline expand/collapse detail panel
 * Clicking a recipient card expands it inline with smooth animation
 */

type MemoryItem = {
  id: string;
  title: string;
  status: "DRAFT" | "RELEASED";
  releaseDate: string | null;
  releasedAt: string | null;
};

type Collection = {
  id: string;
  title: string;
  totalItems: number;
  releasedItems: number;
  items: MemoryItem[];
};

type Recipient = {
  id: string;
  fullName: string;
  identificationNo: string;
  email: string;
  phone: string;
  address: string;
  receiverType: string;
  isClaimed: boolean;
  guardianName: string | null;
  guardianNric: string | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
  guardianAddress: string | null;
  createdAt: string;
  collections: Collection[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function getAvatarStyle(type: string): { bg: string; color: string } {
  if (type === "CHILD") return { bg: "#EEEDFE", color: "#3C3489" };
  if (type === "UNKNOWN") return { bg: "#F1EFE8", color: "#5F5E5A" };
  return { bg: "#E1F5EE", color: "#085041" };
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "6px 0", borderBottom: "1px solid rgba(184,150,90,0.08)" }}>
      <span style={{ fontSize: 12, color: "var(--earth-muted)", flexShrink: 0, minWidth: 100 }}>{label}</span>
      <span style={{ fontSize: 12, color: "var(--earth-mid)", fontWeight: 700, textAlign: "right", marginLeft: 12 }}>{value}</span>
    </div>
  );
}

export default function RecipientsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const loadRecipients = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recipients?page=${currentPage}&limit=10`);
      const json = await res.json();
      setRecipients(json.recipients ?? []);
      setPagination(json.pagination ?? null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") loadRecipients(page);
  }, [status, page, loadRecipients]);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  if (status === "loading") return <TimeBridgeLoading message="Loading recipients..." />;

  return (
    <div className="tb-page tb-page-with-tabs">
      <style>{`
        .rc-detail-panel {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
          opacity: 0;
        }
        .rc-detail-panel.open {
          max-height: 1200px;
          opacity: 1;
        }
        .rc-card {
          border: 1px solid rgba(184,150,90,0.18);
          border-radius: 14px;
          overflow: hidden;
          transition: border-color 220ms ease;
          background: #fff;
        }
        .rc-card:hover { border-color: rgba(184,150,90,0.4); }
        .rc-card.expanded { border-color: #B8965A; box-shadow: 0 2px 16px rgba(184,150,90,0.12); }
        .rc-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          cursor: pointer;
          transition: background 200ms ease;
        }
        .rc-row:hover { background: rgba(184,150,90,0.03); }
        .rc-chevron {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #B8965A;
          flex-shrink: 0;
        }
        .rc-chevron.open { transform: rotate(90deg); }
        .rc-memory-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: #FAF7F2;
          border: 1px solid rgba(184,150,90,0.12);
          border-radius: 10px;
          margin-bottom: 6px;
          cursor: pointer;
          transition: border-color 200ms ease;
        }
        .rc-memory-item:hover { border-color: rgba(184,150,90,0.35); }
        .rc-skeleton {
          background: var(--parchment, #EDE5D8);
          border-radius: 14px;
          animation: tb-skeleton-pulse 1.6s ease-in-out infinite;
        }
        @keyframes tb-skeleton-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
      `}</style>

      <div className="tb-container" style={{ paddingTop: 32, paddingBottom: 48 }}>

        {/* Header */}
        <div className="tb-page-header tb-fade-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1>Recipients</h1>
            <p style={{ color: "var(--earth-muted)", fontSize: 14, marginTop: 6 }}>
              {pagination ? `${pagination.total} ${pagination.total === 1 ? "person" : "people"} receiving your memories` : "Loading..."}
            </p>
          </div>
          <button
            className="tb-btn tb-btn-primary"
            onClick={() => router.push("/dashboard")}
            style={{ fontSize: 12, padding: "10px 18px" }}
          >
            + Create memory
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="rc-skeleton" style={{ height: 72, animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        ) : recipients.length === 0 ? (
          <div className="tb-empty tb-fade-in">
            <div style={{ fontSize: 40, marginBottom: 16 }}>👥</div>
            <div className="tb-empty-title">No recipients yet</div>
            <div className="tb-empty-body">Create a memory to add recipients.</div>
            <button className="tb-btn tb-btn-gold" onClick={() => router.push("/dashboard")} style={{ marginTop: 20 }}>
              Go to dashboard
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recipients.map((r, i) => {
              const isExpanded = expandedId === r.id;
              const avatar = getAvatarStyle(r.receiverType);
              const totalMemories = r.collections.length;
              const releasedMemories = r.collections.filter((c) => c.releasedItems > 0).length;

              return (
                <div
                  key={r.id}
                  className={`rc-card tb-fade-in ${isExpanded ? "expanded" : ""}`}
                  style={{ animationDelay: `${0.05 * i}s` }}
                >
                  {/* Row */}
                  <div className="rc-row" onClick={() => toggleExpand(r.id)}>
                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: avatar.bg, color: avatar.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>
                      {r.fullName === "Unknown" || r.receiverType === "UNKNOWN" ? "?" : getInitials(r.fullName)}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: "var(--earth)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.fullName}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--earth-muted)", marginTop: 2 }}>
                        {r.identificationNo}
                        {r.receiverType === "CHILD" && <span style={{ marginLeft: 6, color: "#534AB7", fontWeight: 700 }}>· Child</span>}
                        {r.receiverType === "UNKNOWN" && <span style={{ marginLeft: 6, color: "var(--earth-muted)" }}>· No contact yet</span>}
                        <span style={{ marginLeft: 6, opacity: 0.5 }}>· {totalMemories} {totalMemories === 1 ? "memory" : "memories"}</span>
                      </div>
                    </div>
                    {/* Claim badge */}
                    <span className={`tb-badge ${r.isClaimed ? "tb-badge-released" : releasedMemories > 0 ? "tb-badge-pending" : "tb-badge-draft"}`}
                      style={{ flexShrink: 0 }}>
                      {r.isClaimed ? "Claimed" : releasedMemories > 0 ? "Waiting" : "Draft"}
                    </span>
                    {/* Chevron */}
                    <svg
                      className={`rc-chevron ${isExpanded ? "open" : ""}`}
                      width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="#B8965A" strokeWidth="2" strokeLinecap="round"
                    >
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </div>

                  {/* Expandable detail panel */}
                  <div className={`rc-detail-panel ${isExpanded ? "open" : ""}`}>
                    <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(184,150,90,0.12)" }}>

                      {/* Recipient details */}
                      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", color: "#B8965A", margin: "14px 0 8px" }}>
                        RECIPIENT DETAILS
                      </div>
                      <div style={{ background: "var(--cream)", borderRadius: 10, padding: "4px 12px" }}>
                        <DetailRow label="NRIC" value={r.identificationNo} />
                        <DetailRow label="Email" value={r.email || "Not provided"} />
                        <DetailRow label="Phone" value={r.phone || "Not provided"} />
                        <DetailRow label="Address" value={r.address} />
                        <DetailRow label="Type" value={r.receiverType === "CHILD" ? "Child" : r.receiverType === "UNKNOWN" ? "No contact yet" : "Adult"} />
                        <DetailRow label="Status" value={r.isClaimed ? "Claimed — recipient has accessed their memory" : "Not yet claimed"} />
                      </div>

                      {/* Guardian section */}
                      {r.guardianName && (
                        <>
                          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", color: "#534AB7", margin: "14px 0 8px" }}>
                            GUARDIAN
                          </div>
                          <div style={{ background: "#F5F3FF", borderRadius: 10, padding: "4px 12px" }}>
                            <DetailRow label="Name" value={r.guardianName} />
                            <DetailRow label="NRIC" value={r.guardianNric} />
                            <DetailRow label="Email" value={r.guardianEmail} />
                            <DetailRow label="Phone" value={r.guardianPhone} />
                            <DetailRow label="Address" value={r.guardianAddress} />
                          </div>
                        </>
                      )}

                      {/* Memories */}
                      {r.collections.length > 0 && (
                        <>
                          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", color: "#B8965A", margin: "14px 0 8px" }}>
                            MEMORIES ({r.collections.length})
                          </div>
                          {r.collections.map((c) => {
                            const allReleased = c.releasedItems === c.totalItems;
                            const someReleased = c.releasedItems > 0;
                            const nextItem = c.items.find((i) => i.status === "DRAFT" && i.releaseDate);
                            return (
                              <div
                                key={c.id}
                                className="rc-memory-item"
                                onClick={() => router.push(`/memory-sent/${c.id}`)}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--earth)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {c.title}
                                  </div>
                                  <div style={{ fontSize: 11, color: "var(--earth-muted)", marginTop: 2 }}>
                                    {nextItem?.releaseDate
                                      ? `Releases ${new Date(nextItem.releaseDate).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}`
                                      : allReleased
                                      ? "All released"
                                      : "Proof-of-life triggered"}
                                  </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                  <span className={`tb-badge ${allReleased ? "tb-badge-released" : someReleased ? "tb-badge-pending" : "tb-badge-draft"}`}>
                                    {allReleased ? "Released" : someReleased ? "Partial" : "Draft"}
                                  </span>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--earth-muted)" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="9,18 15,12 9,6"/>
                                  </svg>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="tb-fade-in" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: 28, padding: "16px 0", borderTop: "1px solid var(--border)",
            flexWrap: "wrap", gap: 12,
          }}>
            <span style={{ fontSize: 13, color: "var(--earth-muted)" }}>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} recipients
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="tb-btn tb-btn-outline"
                onClick={() => setPage((p) => p - 1)}
                disabled={!pagination.hasPrev}
                style={{ fontSize: 12, padding: "8px 16px", opacity: !pagination.hasPrev ? 0.4 : 1 }}
              >
                ← Prev
              </button>
              <button
                className="tb-btn tb-btn-outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNext}
                style={{ fontSize: 12, padding: "8px 16px", opacity: !pagination.hasNext ? 0.4 : 1 }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
