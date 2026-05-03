"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type ClaimCode = {
  id: string;
  claimCode: string | null;
  claimCodeExpiresAt: string | null;
  visitDate: string;
  adminNotes: string | null;
  status: "ACTIVE" | "USED" | "EXPIRED";
  receiver: {
    id: string; fullName: string;
    identificationNo: string; email: string | null; isClaimed: boolean;
  };
};

const s = {
  page: "#1C1814", card: "#2C2416", border: "#3D3020",
  text: "#F0E8D8", muted: "#9B8060", dim: "#6B5840", gold: "#B8965A",
};

function codeStyle(status: string) {
  if (status === "ACTIVE") return { bg: "rgba(29,158,117,0.15)", text: "#5DCAA5", border: "rgba(29,158,117,0.3)" };
  if (status === "USED") return { bg: "rgba(55,138,221,0.15)", text: "#85B7EB", border: "rgba(55,138,221,0.3)" };
  return { bg: "rgba(107,88,64,0.2)", text: "#9B8060", border: "#3D3020" };
}

export default function AdminClaimCodesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [codes, setCodes] = useState<ClaimCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "USED" | "EXPIRED">("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const role = (session?.user as any)?.role;

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => {
    if (status === "authenticated" && role && role !== "ADMIN") router.replace("/dashboard");
  }, [status, role, router]);

  const loadCodes = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/claim-codes/list");
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Failed."); return; }
      setCodes(json.codes ?? []);
    } catch { setError("Network error."); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (status === "authenticated" && role === "ADMIN") loadCodes(); }, [status, role, loadCodes]);

  const filtered = codes.filter((c) => {
    const matchFilter = filter === "ALL" ? true : c.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || c.receiver.fullName.toLowerCase().includes(q) ||
      c.receiver.identificationNo.toLowerCase().includes(q) ||
      (c.claimCode ?? "").toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const counts = {
    ACTIVE: codes.filter((c) => c.status === "ACTIVE").length,
    USED: codes.filter((c) => c.status === "USED").length,
    EXPIRED: codes.filter((c) => c.status === "EXPIRED").length,
  };

  if (status === "loading") return <TimeBridgeLoading message="Loading claim codes..." />;

  return (
    <div style={{ minHeight: "100vh", background: s.page, padding: "24px 20px 48px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${s.border}` }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: s.gold, marginBottom: 4 }}>CLAIM CODES</div>
            <div style={{ fontSize: 13, color: s.muted }}>{counts.ACTIVE} active · {counts.USED} used · {counts.EXPIRED} expired</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => router.push("/admin/receivers")} style={{ background: "rgba(184,150,90,0.15)", border: `1px solid ${s.gold}`, color: s.gold, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>+ Generate code</button>
            <button onClick={() => router.push("/admin")} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>← Admin home</button>
            <button onClick={loadCodes} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>↻ Refresh</button>
          </div>
        </div>

        <div style={{ background: "rgba(55,138,221,0.1)", border: "1px solid rgba(55,138,221,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#85B7EB", marginBottom: 16, lineHeight: 1.6 }}>
          Claim codes are generated per receiver during physical visits. To generate a new code go to Receiver Management and click "Generate claim code".
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            placeholder="Search by receiver name, NRIC or code..."
            style={{ flex: 1, background: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px", color: s.text, fontSize: 13, fontFamily: "var(--font-body)", outline: "none" }}
          />
          <button onClick={() => setSearch(searchInput)} style={{ background: "rgba(184,150,90,0.15)", border: `1px solid ${s.gold}`, color: s.gold, borderRadius: 8, padding: "10px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Search</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {(["ALL", "ACTIVE", "USED", "EXPIRED"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 20, cursor: "pointer",
              background: filter === f ? "rgba(184,150,90,0.15)" : "transparent",
              border: `1px solid ${filter === f ? s.gold : s.border}`,
              color: filter === f ? s.gold : s.muted, fontFamily: "var(--font-body)",
            }}>{f === "ALL" ? `All (${codes.length})` : `${f} (${counts[f]})`}</button>
          ))}
        </div>

        {error && <div style={{ background: "rgba(226,75,74,0.1)", border: "1px solid rgba(226,75,74,0.3)", borderRadius: 8, padding: "10px 14px", color: "#F09595", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[0,1,2].map((i) => <div key={i} style={{ height: 80, borderRadius: 10, background: s.card, opacity: 0.5 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: s.muted }}>
            <div style={{ fontSize: 15, fontFamily: "var(--font-display)", color: s.text }}>No claim codes found</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((code) => {
              const cs = codeStyle(code.status);
              return (
                <div key={code.id} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 4, color: cs.text, fontFamily: "monospace", marginBottom: 8 }}>
                        {code.claimCode ?? "N/A"}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: s.text, marginBottom: 2 }}>{code.receiver.fullName}</div>
                      <div style={{ fontSize: 12, color: s.muted }}>{code.receiver.identificationNo} · {code.receiver.email ?? "No email"}</div>
                      {code.adminNotes && <div style={{ fontSize: 12, color: s.dim, marginTop: 6, fontStyle: "italic" }}>Note: {code.adminNotes}</div>}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: cs.bg, color: cs.text, border: `1px solid ${cs.border}`, display: "inline-block", marginBottom: 8 }}>{code.status}</span>
                      <div style={{ fontSize: 11, color: s.dim }}>
                        {code.claimCodeExpiresAt
                          ? code.status === "ACTIVE" ? `Expires ${new Date(code.claimCodeExpiresAt).toLocaleDateString("en-SG")}`
                          : code.status === "EXPIRED" ? `Expired ${new Date(code.claimCodeExpiresAt).toLocaleDateString("en-SG")}` : "Used"
                          : ""}
                      </div>
                      <div style={{ fontSize: 11, color: s.dim, marginTop: 2 }}>Generated {new Date(code.visitDate).toLocaleDateString("en-SG")}</div>
                    </div>
                  </div>
                  {code.status === "ACTIVE" && code.claimCode && (
                    <button onClick={() => navigator.clipboard.writeText(code.claimCode!)} style={{ marginTop: 10, background: "rgba(29,158,117,0.15)", border: "1px solid rgba(29,158,117,0.3)", color: "#5DCAA5", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Copy code</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
