"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  performedBy: { name: string; email: string } | null;
  details: Record<string, any> | null;
  createdAt: string;
};

const s = {
  page: "#1C1814", card: "#2C2416", border: "#3D3020",
  text: "#F0E8D8", muted: "#9B8060", dim: "#6B5840", gold: "#B8965A",
};

function actionStyle(action: string) {
  if (action.includes("RECALL")) return { bg: "rgba(226,75,74,0.15)", text: "#F09595", border: "rgba(226,75,74,0.3)" };
  if (action.includes("GUARDIAN")) return { bg: "rgba(55,138,221,0.15)", text: "#85B7EB", border: "rgba(55,138,221,0.3)" };
  if (action.includes("VERIFICATION")) return { bg: "rgba(29,158,117,0.15)", text: "#5DCAA5", border: "rgba(29,158,117,0.3)" };
  if (action.includes("MEMORY")) return { bg: "rgba(127,119,221,0.15)", text: "#AFA9EC", border: "rgba(127,119,221,0.3)" };
  return { bg: "rgba(107,88,64,0.2)", text: s.muted, border: s.border };
}

const ACTION_FILTERS = ["ALL", "MEMORY", "GUARDIAN", "RECEIVER", "VERIFICATION"];

export default function AdminAuditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const role = (session?.user as any)?.role;

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => {
    if (status === "authenticated" && role && role !== "ADMIN") router.replace("/dashboard");
  }, [status, role, router]);

  const loadLogs = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ action: filter, page: String(page) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/audit?${params}`);
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Failed."); return; }
      setLogs(json.logs ?? []);
      setTotalPages(json.totalPages ?? 1);
      setTotal(json.total ?? 0);
    } catch { setError("Network error."); } finally { setLoading(false); }
  }, [filter, page, search]);

  useEffect(() => { if (status === "authenticated" && role === "ADMIN") loadLogs(); }, [status, role, loadLogs]);

  function handleSearch() { setSearch(searchInput); setPage(1); }

  if (status === "loading") return <TimeBridgeLoading message="Loading audit log..." />;

  return (
    <div style={{ minHeight: "100vh", background: s.page, padding: "24px 20px 48px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${s.border}` }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: s.gold, marginBottom: 4 }}>AUDIT LOG</div>
            <div style={{ fontSize: 13, color: s.muted }}>{total} total entries</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => router.push("/admin")} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>← Admin home</button>
            <button onClick={loadLogs} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>↻ Refresh</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by action, entity or performed by..."
            style={{ flex: 1, background: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px", color: s.text, fontSize: 13, fontFamily: "var(--font-body)", outline: "none" }}
          />
          <button onClick={handleSearch} style={{ background: "rgba(184,150,90,0.15)", border: `1px solid ${s.gold}`, color: s.gold, borderRadius: 8, padding: "10px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Search</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {ACTION_FILTERS.map((f) => (
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[0,1,2,3].map((i) => <div key={i} style={{ height: 60, borderRadius: 10, background: s.card, opacity: 0.5 }} />)}
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: s.muted }}>
            <div style={{ fontSize: 15, fontFamily: "var(--font-display)", color: s.text }}>No audit entries found</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {logs.map((log) => {
              const as = actionStyle(log.action);
              return (
                <div key={log.id} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: as.bg, color: as.text, border: `1px solid ${as.border}`, fontFamily: "monospace" }}>
                          {log.action}
                        </span>
                        <span style={{ fontSize: 11, color: s.dim }}>
                          {log.entity}{log.entityId && ` #${log.entityId.slice(0, 8)}...`}
                        </span>
                      </div>
                      {log.performedBy && (
                        <div style={{ fontSize: 12, color: s.muted, marginBottom: 6 }}>
                          By: {log.performedBy.name} · {log.performedBy.email}
                        </div>
                      )}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div style={{ background: "#1C1814", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: s.dim, fontFamily: "monospace", lineHeight: 1.7 }}>
                          {Object.entries(log.details).map(([key, value]) => (
                            <div key={key}>
                              <span style={{ color: s.muted }}>{key}:</span>{" "}
                              {typeof value === "object" ? JSON.stringify(value) : String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: s.dim, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {new Date(log.createdAt).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })} SGT
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: `1px solid ${s.border}`, flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 12, color: s.dim }}>Page {page} of {totalPages} · {total} entries</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 11, fontFamily: "var(--font-body)", opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 11, fontFamily: "var(--font-body)", opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
