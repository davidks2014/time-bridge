"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type PendingUser = {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  identificationNo: string;
  address: string;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  verificationDocFrontUrl: string | null;
  verificationDocBackUrl: string | null;
  createdAt: string;
};

const ADMIN_DARK = {
  page: "#1C1814",
  card: "#2C2416",
  border: "#3D3020",
  text: "#F0E8D8",
  muted: "#9B8060",
  dim: "#6B5840",
  gold: "#B8965A",
};

export default function AdminVerificationPage() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const role = (session?.user as any)?.role;

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => {
    if (status !== "authenticated") return;
    if (role && role !== "ADMIN") router.replace("/dashboard");
  }, [status, role, router]);
  useEffect(() => { if (status === "authenticated" && role === "ADMIN") loadPending(); }, [status, role]);

  async function loadPending() {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/admin/verification/pending");
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Failed to load."); return; }
      setUsers(json.users ?? []);
    } catch { setError("Network error."); } finally { setLoading(false); }
  }

  async function approveUser(userId: string) {
    setActing((p) => ({ ...p, [userId]: true }));
    try {
      const res = await fetch("/api/admin/verification/decision", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, decision: "APPROVE" }),
      });
      if (res.ok) setUsers((p) => p.filter((u) => u.id !== userId));
      else setError((await res.json())?.error ?? "Failed.");
    } catch { setError("Network error."); } finally { setActing((p) => ({ ...p, [userId]: false })); }
  }

  async function rejectUser(userId: string) {
    const reason = (rejectReasons[userId] ?? "").trim();
    if (!reason) { setError("Reject reason is required."); return; }
    setActing((p) => ({ ...p, [userId]: true }));
    try {
      const res = await fetch("/api/admin/verification/decision", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, decision: "REJECT", rejectReason: reason }),
      });
      if (res.ok) setUsers((p) => p.filter((u) => u.id !== userId));
      else setError((await res.json())?.error ?? "Failed.");
    } catch { setError("Network error."); } finally { setActing((p) => ({ ...p, [userId]: false })); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchFilter = filter === "ALL" ? true : u.verificationStatus === filter;
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.identificationNo.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [users, filter, search]);

  const counts = useMemo(() => ({
    PENDING: users.filter((u) => u.verificationStatus === "PENDING").length,
    APPROVED: users.filter((u) => u.verificationStatus === "APPROVED").length,
    REJECTED: users.filter((u) => u.verificationStatus === "REJECTED").length,
  }), [users]);

  if (status === "loading" || loading) return <TimeBridgeLoading message="Loading verification queue..." />;

  const c = ADMIN_DARK;

  return (
    <div style={{ minHeight: "100vh", background: c.page, padding: "24px 20px 48px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${c.border}` }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: c.gold, marginBottom: 4 }}>VERIFICATION QUEUE</div>
            <div style={{ fontSize: 13, color: c.muted }}>{counts.PENDING} pending · {counts.APPROVED} approved · {counts.REJECTED} rejected</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => router.push("/admin")} style={{ background: "transparent", border: `1px solid ${c.border}`, color: c.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>← Admin home</button>
            <button onClick={loadPending} style={{ background: "transparent", border: `1px solid ${c.border}`, color: c.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>↻ Refresh</button>
          </div>
        </div>

        {/* Search */}
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or NRIC..."
          style={{ width: "100%", background: c.card, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 14px", color: c.text, fontSize: 13, fontFamily: "var(--font-body)", marginBottom: 12, outline: "none", boxSizing: "border-box" }}
        />

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 20, cursor: "pointer",
              background: filter === f ? "rgba(184,150,90,0.15)" : "transparent",
              border: `1px solid ${filter === f ? c.gold : c.border}`,
              color: filter === f ? c.gold : c.muted,
              fontFamily: "var(--font-body)",
            }}>
              {f === "ALL" ? `All (${users.length})` : `${f} (${counts[f]})`}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <div style={{ background: "rgba(226,75,74,0.1)", border: "1px solid rgba(226,75,74,0.3)", borderRadius: 8, padding: "10px 14px", color: "#F09595", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: c.muted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 15, fontFamily: "var(--font-display)", color: c.text }}>Queue is clear</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>No {filter === "ALL" ? "" : filter.toLowerCase()} verifications found</div>
          </div>
        )}

        {/* User cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((u) => {
            const busy = !!acting[u.id];
            const isExpanded = expandedId === u.id;
            const statusColor = u.verificationStatus === "APPROVED" ? { bg: "rgba(29,158,117,0.15)", text: "#5DCAA5", border: "rgba(29,158,117,0.3)" }
              : u.verificationStatus === "REJECTED" ? { bg: "rgba(226,75,74,0.15)", text: "#F09595", border: "rgba(226,75,74,0.3)" }
              : { bg: "rgba(250,199,117,0.15)", text: "#FAC775", border: "rgba(250,199,117,0.3)" };

            return (
              <div key={u.id} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: "hidden" }}>
                {/* Card header — clickable to expand */}
                <div onClick={() => setExpandedId(isExpanded ? null : u.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, cursor: "pointer" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(184,150,90,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: c.gold, flexShrink: 0 }}>
                    {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{u.email} · {u.identificationNo}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}`, flexShrink: 0 }}>
                    {u.verificationStatus}
                  </span>
                  <svg style={{ transition: "transform 0.3s ease", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.gold} strokeWidth="2" strokeLinecap="round"><polyline points="9,18 15,12 9,6"/></svg>
                </div>

                {/* Expandable detail */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${c.border}`, padding: 16 }}>
                    {/* Fields */}
                    <div style={{ background: "#1C1814", borderRadius: 10, padding: "4px 12px", marginBottom: 14 }}>
                      {[
                        { label: "Phone", value: u.phoneNumber },
                        { label: "Address", value: u.address },
                        { label: "Submitted", value: new Date(u.createdAt).toLocaleString("en-SG") },
                      ].map((row) => (
                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${c.border}`, fontSize: 12 }}>
                          <span style={{ color: c.muted }}>{row.label}</span>
                          <span style={{ color: c.text, fontWeight: 700, textAlign: "right", marginLeft: 12 }}>{row.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Documents */}
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", color: c.gold, marginBottom: 10 }}>VERIFICATION DOCUMENTS</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                      {[
                        { label: "FRONT", url: u.verificationDocFrontUrl },
                        { label: "BACK (OPTIONAL)", url: u.verificationDocBackUrl },
                      ].map((doc) => (
                        <div key={doc.label} style={{ background: "#1C1814", border: `1px solid ${c.border}`, borderRadius: 10, padding: 10 }}>
                          <div style={{ fontSize: 10, color: c.muted, letterSpacing: "0.06em", marginBottom: 8, fontWeight: 700 }}>{doc.label}</div>
                          {doc.url ? (
                            <img src={doc.url} alt={doc.label} style={{ width: "100%", borderRadius: 8, border: `1px solid ${c.border}`, display: "block" }} />
                          ) : (
                            <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center", color: c.dim, fontSize: 12 }}>No image</div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button onClick={() => approveUser(u.id)} disabled={busy} style={{ background: "rgba(29,158,117,0.2)", border: "1px solid rgba(29,158,117,0.4)", color: "#5DCAA5", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body)" }}>
                        {busy ? "Working..." : "✓ Approve"}
                      </button>
                      <input
                        value={rejectReasons[u.id] ?? ""}
                        onChange={(e) => setRejectReasons((p) => ({ ...p, [u.id]: e.target.value }))}
                        placeholder="Reject reason (required)..."
                        style={{ flex: 1, minWidth: 160, background: "#1C1814", border: `1px solid ${c.border}`, borderRadius: 8, padding: "8px 12px", color: c.text, fontSize: 12, fontFamily: "var(--font-body)", outline: "none" }}
                      />
                      <button onClick={() => rejectUser(u.id)} disabled={busy} style={{ background: "rgba(226,75,74,0.15)", border: "1px solid rgba(226,75,74,0.3)", color: "#F09595", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body)" }}>
                        {busy ? "Working..." : "✕ Reject"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
