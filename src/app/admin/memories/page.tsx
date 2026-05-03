"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type MemoryItem = {
  id: string; title: string; status: string;
  releaseDate: string | null; releasedAt: string | null; viewedAt: string | null;
};

type Collection = {
  id: string; title: string; createdAt: string;
  sender: { id: string; name: string; email: string; identificationNo: string | null; verificationStatus: string; proofOfLifeStage: string; };
  receiver: { id: string; fullName: string; identificationNo: string; email: string | null; receiverType: string; isClaimed: boolean; };
  items: MemoryItem[];
  totalItems: number; releasedItems: number; viewedItems: number;
};

type Pagination = {
  page: number; limit: number; total: number;
  totalPages: number; hasNext: boolean; hasPrev: boolean;
};

const s = {
  page: "#1C1814", card: "#2C2416", border: "#3D3020",
  text: "#F0E8D8", muted: "#9B8060", dim: "#6B5840", gold: "#B8965A",
};

function proofStyle(p: string) {
  if (p === "CRITICAL") return "#F09595";
  if (p === "WARNING") return "#FAC775";
  return "#5DCAA5";
}

export default function AdminMemoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "DRAFT" | "RELEASED" | "VIEWED">("ALL");
  const [page, setPage] = useState(1);

  const role = (session?.user as any)?.role;

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => {
    if (status === "authenticated" && role && role !== "ADMIN") router.replace("/dashboard");
  }, [status, role, router]);

  const loadMemories = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", status: filter });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/memories?${params}`);
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Failed."); return; }
      setCollections(json.collections ?? []);
      setPagination(json.pagination ?? null);
    } catch { setError("Network error."); } finally { setLoading(false); }
  }, [page, filter, search]);

  useEffect(() => { if (status === "authenticated" && role === "ADMIN") loadMemories(); }, [status, role, loadMemories]);

  function handleSearch() { setSearch(searchInput); setPage(1); }

  if (status === "loading") return <TimeBridgeLoading message="Loading memory oversight..." />;

  return (
    <div style={{ minHeight: "100vh", background: s.page, padding: "24px 20px 48px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${s.border}` }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: s.gold, marginBottom: 4 }}>MEMORY OVERSIGHT</div>
            <div style={{ fontSize: 13, color: s.muted }}>{pagination?.total ?? 0} memories total</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => router.push("/admin")} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>← Admin home</button>
            <button onClick={loadMemories} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>↻ Refresh</button>
          </div>
        </div>

        {/* Search */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by sender name, email, NRIC or receiver NRIC..."
            style={{ flex: 1, background: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px", color: s.text, fontSize: 13, fontFamily: "var(--font-body)", outline: "none" }}
          />
          <button onClick={handleSearch} style={{ background: "rgba(184,150,90,0.15)", border: `1px solid ${s.gold}`, color: s.gold, borderRadius: 8, padding: "10px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Search</button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {(["ALL", "DRAFT", "RELEASED", "VIEWED"] as const).map((f) => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }} style={{
              fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 20, cursor: "pointer",
              background: filter === f ? "rgba(184,150,90,0.15)" : "transparent",
              border: `1px solid ${filter === f ? s.gold : s.border}`,
              color: filter === f ? s.gold : s.muted, fontFamily: "var(--font-body)",
            }}>{f}</button>
          ))}
        </div>

        {error && <div style={{ background: "rgba(226,75,74,0.1)", border: "1px solid rgba(226,75,74,0.3)", borderRadius: 8, padding: "10px 14px", color: "#F09595", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0,1,2].map((i) => <div key={i} style={{ height: 100, borderRadius: 12, background: s.card, opacity: 0.5 }} />)}
          </div>
        ) : collections.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: s.muted }}>
            <div style={{ fontSize: 15, fontFamily: "var(--font-display)", color: s.text }}>No memories found</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Try a different filter or search term</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {collections.map((col) => {
              const allReleased = col.releasedItems === col.totalItems && col.totalItems > 0;
              const someReleased = col.releasedItems > 0;
              const releaseColor = allReleased ? { bg: "rgba(29,158,117,0.15)", text: "#5DCAA5", border: "rgba(29,158,117,0.3)" }
                : someReleased ? { bg: "rgba(250,199,117,0.15)", text: "#FAC775", border: "rgba(250,199,117,0.3)" }
                : { bg: "rgba(107,88,64,0.2)", text: s.muted, border: s.border };

              return (
                <div key={col.id} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 14, padding: 16 }}>
                  {/* Title + badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: s.text }}>{col.title}</div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: releaseColor.bg, color: releaseColor.text, border: `1px solid ${releaseColor.border}` }}>
                        {col.releasedItems}/{col.totalItems} released{col.viewedItems > 0 ? ` · ${col.viewedItems} viewed` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Sender + Receiver */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div style={{ background: "#1C1814", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: s.dim, letterSpacing: "0.06em", marginBottom: 6, fontWeight: 700 }}>SENDER</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: s.text }}>{col.sender.name}</div>
                      <div style={{ fontSize: 11, color: s.muted, marginTop: 2 }}>{col.sender.email}</div>
                      <div style={{ fontSize: 11, color: s.dim, marginTop: 2 }}>NRIC: {col.sender.identificationNo ?? "—"}</div>
                      <div style={{ fontSize: 11, marginTop: 4, fontWeight: 700, color: proofStyle(col.sender.proofOfLifeStage) }}>Proof: {col.sender.proofOfLifeStage}</div>
                    </div>
                    <div style={{ background: "#1C1814", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: s.dim, letterSpacing: "0.06em", marginBottom: 6, fontWeight: 700 }}>RECEIVER</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: s.text }}>{col.receiver.fullName}</div>
                      <div style={{ fontSize: 11, color: s.muted, marginTop: 2 }}>{col.receiver.identificationNo} · {col.receiver.receiverType}</div>
                      <div style={{ fontSize: 11, marginTop: 4, fontWeight: 700, color: col.receiver.isClaimed ? "#5DCAA5" : "#FAC775" }}>
                        {col.receiver.isClaimed ? "✓ Claimed" : "Not yet claimed"}
                      </div>
                    </div>
                  </div>

                  {/* Memory items */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {col.items.map((item) => (
                      <div key={item.id} style={{ background: "#1C1814", border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: s.text }}>{item.title}</div>
                          <div style={{ fontSize: 11, color: s.dim, marginTop: 2 }}>
                            {item.releasedAt ? `Released ${new Date(item.releasedAt).toLocaleDateString("en-SG")}` : item.releaseDate ? `Releases ${new Date(item.releaseDate).toLocaleDateString("en-SG")}` : "Proof-of-life triggered"}
                            {item.viewedAt ? ` · Viewed ${new Date(item.viewedAt).toLocaleDateString("en-SG")}` : ""}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                          background: item.status === "RELEASED" ? "rgba(29,158,117,0.15)" : "rgba(107,88,64,0.2)",
                          color: item.status === "RELEASED" ? "#5DCAA5" : s.muted,
                          border: `1px solid ${item.status === "RELEASED" ? "rgba(29,158,117,0.3)" : s.border}` }}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 11, color: s.dim, marginTop: 10 }}>
                    Created {new Date(col.createdAt).toLocaleDateString("en-SG")}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: `1px solid ${s.border}`, flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 12, color: s.dim }}>Page {pagination.page} of {pagination.totalPages} · {pagination.total} memories</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPage((p) => p - 1)} disabled={!pagination.hasPrev} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: pagination.hasPrev ? "pointer" : "not-allowed", fontSize: 11, fontFamily: "var(--font-body)", opacity: pagination.hasPrev ? 1 : 0.4 }}>← Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={!pagination.hasNext} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: pagination.hasNext ? "pointer" : "not-allowed", fontSize: 11, fontFamily: "var(--font-body)", opacity: pagination.hasNext ? 1 : 0.4 }}>Next →</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
