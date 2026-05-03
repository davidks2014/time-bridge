"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  verificationStatus: string;
  identificationNo: string | null;
  phoneNumber: string | null;
  proofOfLifeStage: string;
  lastConfirmedAt: string | null;
  missedConfirmations: number;
  createdAt: string;
  _count: { collections: number };
};

type Pagination = {
  page: number; limit: number; total: number;
  totalPages: number; hasNext: boolean; hasPrev: boolean;
};

const s = {
  page: "#1C1814", card: "#2C2416", border: "#3D3020",
  text: "#F0E8D8", muted: "#9B8060", dim: "#6B5840", gold: "#B8965A",
};

function statusStyle(v: string) {
  if (v === "APPROVED") return { bg: "rgba(29,158,117,0.15)", text: "#5DCAA5", border: "rgba(29,158,117,0.3)" };
  if (v === "REJECTED") return { bg: "rgba(226,75,74,0.15)", text: "#F09595", border: "rgba(226,75,74,0.3)" };
  return { bg: "rgba(250,199,117,0.15)", text: "#FAC775", border: "rgba(250,199,117,0.3)" };
}

function proofStyle(p: string) {
  if (p === "CRITICAL") return "#F09595";
  if (p === "WARNING") return "#FAC775";
  return "#5DCAA5";
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<Record<string, boolean>>({});

  const role = (session?.user as any)?.role;

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => {
    if (status === "authenticated" && role && role !== "ADMIN") router.replace("/dashboard");
  }, [status, role, router]);

  const loadUsers = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", status: filter });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Failed."); return; }
      setUsers(json.users ?? []);
      setPagination(json.pagination ?? null);
    } catch { setError("Network error."); } finally { setLoading(false); }
  }, [page, filter, search]);

  useEffect(() => { if (status === "authenticated" && role === "ADMIN") loadUsers(); }, [status, role, loadUsers]);

  async function performAction(userId: string, action: string) {
    setActing((p) => ({ ...p, [userId]: true })); setActionMsg(""); setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Failed."); return; }
      setActionMsg(json.message);
      await loadUsers();
    } catch { setError("Network error."); } finally { setActing((p) => ({ ...p, [userId]: false })); }
  }

  function handleSearch() { setSearch(searchInput); setPage(1); }

  if (status === "loading") return <TimeBridgeLoading message="Loading users..." />;

  return (
    <div style={{ minHeight: "100vh", background: s.page, padding: "24px 20px 48px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${s.border}` }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: s.gold, marginBottom: 4 }}>USER MANAGEMENT</div>
            <div style={{ fontSize: 13, color: s.muted }}>{pagination?.total ?? 0} users total</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => router.push("/admin")} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>← Admin home</button>
            <button onClick={loadUsers} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>↻ Refresh</button>
          </div>
        </div>

        {/* Search */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by name, email or NRIC..."
            style={{ flex: 1, background: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px", color: s.text, fontSize: 13, fontFamily: "var(--font-body)", outline: "none" }}
          />
          <button onClick={handleSearch} style={{ background: "rgba(184,150,90,0.15)", border: `1px solid ${s.gold}`, color: s.gold, borderRadius: 8, padding: "10px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Search</button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }} style={{
              fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 20, cursor: "pointer",
              background: filter === f ? "rgba(184,150,90,0.15)" : "transparent",
              border: `1px solid ${filter === f ? s.gold : s.border}`,
              color: filter === f ? s.gold : s.muted, fontFamily: "var(--font-body)",
            }}>{f}</button>
          ))}
        </div>

        {error && <div style={{ background: "rgba(226,75,74,0.1)", border: "1px solid rgba(226,75,74,0.3)", borderRadius: 8, padding: "10px 14px", color: "#F09595", fontSize: 13, marginBottom: 16 }}>{error}</div>}
        {actionMsg && <div style={{ background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: 8, padding: "10px 14px", color: "#5DCAA5", fontSize: 13, marginBottom: 16 }}>{actionMsg}</div>}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0,1,2].map((i) => <div key={i} style={{ height: 80, borderRadius: 12, background: s.card, opacity: 0.5 }} />)}
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: s.muted }}>
            <div style={{ fontSize: 15, fontFamily: "var(--font-display)", color: s.text }}>No users found</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {users.map((user) => {
              const vs = statusStyle(user.verificationStatus);
              const busy = !!acting[user.id];
              return (
                <div key={user.id} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: s.text }}>{user.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: vs.bg, color: vs.text, border: `1px solid ${vs.border}` }}>{user.verificationStatus}</span>
                        {user.proofOfLifeStage !== "NORMAL" && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(226,75,74,0.1)", color: "#F09595", border: "1px solid rgba(226,75,74,0.2)" }}>{user.proofOfLifeStage}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: s.muted }}>{user.email}</div>
                      <div style={{ fontSize: 11, color: s.dim, marginTop: 6, lineHeight: 1.7 }}>
                        NRIC: {user.identificationNo ?? "Not set"} · Phone: {user.phoneNumber ?? "Not set"} · Memories: {user._count.collections}<br/>
                        Proof-of-life: <span style={{ color: proofStyle(user.proofOfLifeStage), fontWeight: 700 }}>{user.proofOfLifeStage}</span> · Missed: {user.missedConfirmations} · Last confirmed: {user.lastConfirmedAt ? new Date(user.lastConfirmedAt).toLocaleDateString("en-SG") : "Never"}<br/>
                        Joined: {new Date(user.createdAt).toLocaleDateString("en-SG")}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                      {user.verificationStatus === "PENDING" && (
                        <>
                          <button onClick={() => performAction(user.id, "FORCE_APPROVE")} disabled={busy} style={{ background: "rgba(29,158,117,0.2)", border: "1px solid rgba(29,158,117,0.4)", color: "#5DCAA5", borderRadius: 6, padding: "6px 12px", cursor: busy ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-body)" }}>Force approve</button>
                          <button onClick={() => performAction(user.id, "FORCE_REJECT")} disabled={busy} style={{ background: "rgba(226,75,74,0.15)", border: "1px solid rgba(226,75,74,0.3)", color: "#F09595", borderRadius: 6, padding: "6px 12px", cursor: busy ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-body)" }}>Force reject</button>
                        </>
                      )}
                      {user.proofOfLifeStage !== "NORMAL" && (
                        <button onClick={() => performAction(user.id, "RESET_PROOF")} disabled={busy} style={{ background: "rgba(184,150,90,0.15)", border: `1px solid ${s.gold}`, color: s.gold, borderRadius: 6, padding: "6px 12px", cursor: busy ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-body)" }}>Reset proof</button>
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: `1px solid ${s.border}`, flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 12, color: s.dim }}>Page {pagination.page} of {pagination.totalPages} · {pagination.total} users</span>
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
