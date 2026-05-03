"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type Collection = {
  id: string; title: string;
  totalItems: number; releasedItems: number;
  latestReleasedAt: string | null;
};

type Receiver = {
  id: string; fullName: string; identificationNo: string;
  email: string | null; phone: string | null; address: string;
  receiverType: string; isClaimed: boolean;
  linkedUser: { name: string; email: string } | null;
  guardianName: string | null; guardianEmail: string | null;
  senderName: string | null; senderEmail: string | null;
  createdAt: string; collections: Collection[];
  lastDeliveryAttempt: { channel: string; status: string; attemptedAt: string } | null;
  hasActiveInvite: boolean;
};

const s = {
  page: "#1C1814", card: "#2C2416", border: "#3D3020",
  text: "#F0E8D8", muted: "#9B8060", dim: "#6B5840", gold: "#B8965A",
};

export default function AdminReceiversPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "UNCLAIMED" | "CLAIMED" | "FAILED">("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState<string | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<Record<string, string>>({});
  const [codeError, setCodeError] = useState("");

  const role = (session?.user as any)?.role;

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => {
    if (status === "authenticated" && role && role !== "ADMIN") router.replace("/dashboard");
  }, [status, role, router]);

  const loadReceivers = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/receivers");
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Failed."); return; }
      setReceivers(json.receivers ?? []);
    } catch { setError("Network error."); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (status === "authenticated" && role === "ADMIN") loadReceivers(); }, [status, role, loadReceivers]);

  async function generateClaimCode(receiverId: string) {
    setCodeError(""); setGeneratingCode(receiverId);
    try {
      const res = await fetch("/api/admin/claim-codes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId }),
      });
      const json = await res.json();
      if (!res.ok) { setCodeError(json?.error ?? "Failed."); return; }
      setGeneratedCodes((p) => ({ ...p, [receiverId]: json.claimCode }));
    } catch { setCodeError("Network error."); } finally { setGeneratingCode(null); }
  }

  const filtered = receivers.filter((r) => {
    const hasReleased = r.collections.some((c) => c.releasedItems > 0);
    const matchFilter =
      filter === "UNCLAIMED" ? !r.isClaimed && hasReleased :
      filter === "CLAIMED" ? r.isClaimed :
      filter === "FAILED" ? r.lastDeliveryAttempt?.status === "FAILED" : true;
    const q = search.toLowerCase();
    const matchSearch = !q || r.fullName.toLowerCase().includes(q) ||
      r.identificationNo.toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q) ||
      (r.senderName ?? "").toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const counts = {
    unclaimed: receivers.filter((r) => !r.isClaimed && r.collections.some((c) => c.releasedItems > 0)).length,
    claimed: receivers.filter((r) => r.isClaimed).length,
    failed: receivers.filter((r) => r.lastDeliveryAttempt?.status === "FAILED").length,
  };

  if (status === "loading") return <TimeBridgeLoading message="Loading receivers..." />;

  return (
    <div style={{ minHeight: "100vh", background: s.page, padding: "24px 20px 48px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${s.border}` }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: s.gold, marginBottom: 4 }}>RECEIVER MANAGEMENT</div>
            <div style={{ fontSize: 13, color: s.muted }}>{receivers.length} total · {counts.unclaimed} awaiting claim · {counts.claimed} claimed</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => router.push("/admin")} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>← Admin home</button>
            <button onClick={loadReceivers} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>↻ Refresh</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            placeholder="Search by name, NRIC, email or sender..."
            style={{ flex: 1, background: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px", color: s.text, fontSize: 13, fontFamily: "var(--font-body)", outline: "none" }}
          />
          <button onClick={() => setSearch(searchInput)} style={{ background: "rgba(184,150,90,0.15)", border: `1px solid ${s.gold}`, color: s.gold, borderRadius: 8, padding: "10px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Search</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {([
            { key: "ALL", label: `All (${receivers.length})` },
            { key: "UNCLAIMED", label: `Awaiting claim (${counts.unclaimed})` },
            { key: "CLAIMED", label: `Claimed (${counts.claimed})` },
            { key: "FAILED", label: `Failed delivery (${counts.failed})` },
          ] as const).map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 20, cursor: "pointer",
              background: filter === f.key ? "rgba(184,150,90,0.15)" : "transparent",
              border: `1px solid ${filter === f.key ? s.gold : s.border}`,
              color: filter === f.key ? s.gold : s.muted, fontFamily: "var(--font-body)",
            }}>{f.label}</button>
          ))}
        </div>

        {error && <div style={{ background: "rgba(226,75,74,0.1)", border: "1px solid rgba(226,75,74,0.3)", borderRadius: 8, padding: "10px 14px", color: "#F09595", fontSize: 13, marginBottom: 16 }}>{error}</div>}
        {codeError && <div style={{ background: "rgba(226,75,74,0.1)", border: "1px solid rgba(226,75,74,0.3)", borderRadius: 8, padding: "10px 14px", color: "#F09595", fontSize: 13, marginBottom: 16 }}>{codeError}</div>}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0,1,2].map((i) => <div key={i} style={{ height: 80, borderRadius: 12, background: s.card, opacity: 0.5 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: s.muted }}>
            <div style={{ fontSize: 15, fontFamily: "var(--font-display)", color: s.text }}>No receivers found</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((r) => {
              const hasReleased = r.collections.some((c) => c.releasedItems > 0);
              const isExpanded = expandedId === r.id;
              const generatedCode = generatedCodes[r.id];
              const claimStyle = r.isClaimed
                ? { bg: "rgba(29,158,117,0.15)", text: "#5DCAA5", border: "rgba(29,158,117,0.3)" }
                : hasReleased
                ? { bg: "rgba(250,199,117,0.15)", text: "#FAC775", border: "rgba(250,199,117,0.3)" }
                : { bg: "rgba(107,88,64,0.2)", text: s.muted, border: s.border };

              return (
                <div key={r.id} style={{ background: s.card, border: `1px solid ${isExpanded ? s.gold : s.border}`, borderRadius: 14, overflow: "hidden", transition: "border-color 200ms" }}>
                  <div onClick={() => setExpandedId(isExpanded ? null : r.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, cursor: "pointer" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(184,150,90,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: s.gold, flexShrink: 0 }}>
                      {r.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: s.text, marginBottom: 2 }}>{r.fullName}</div>
                      <div style={{ fontSize: 12, color: s.muted }}>{r.identificationNo} · From: {r.senderName ?? "Unknown"}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: claimStyle.bg, color: claimStyle.text, border: `1px solid ${claimStyle.border}` }}>
                        {r.isClaimed ? "Claimed" : hasReleased ? "Awaiting" : "No release"}
                      </span>
                      {r.lastDeliveryAttempt?.status === "FAILED" && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(226,75,74,0.15)", color: "#F09595", border: "1px solid rgba(226,75,74,0.3)" }}>Failed</span>
                      )}
                      <svg style={{ transition: "transform 0.3s ease", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.gold} strokeWidth="2" strokeLinecap="round"><polyline points="9,18 15,12 9,6"/></svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${s.border}`, padding: 16 }}>
                      <div style={{ background: "#1C1814", borderRadius: 10, padding: "4px 12px", marginBottom: 14 }}>
                        {[
                          { label: "Email", value: r.email || "Not provided" },
                          { label: "Phone", value: r.phone || "Not provided" },
                          { label: "Address", value: r.address },
                          { label: "Type", value: r.receiverType },
                          { label: "Sender", value: `${r.senderName} (${r.senderEmail})` },
                          ...(r.guardianName ? [{ label: "Guardian", value: `${r.guardianName} · ${r.guardianEmail}` }] : []),
                          ...(r.linkedUser ? [{ label: "Claimed by", value: `${r.linkedUser.name} (${r.linkedUser.email})` }] : []),
                        ].map((row) => (
                          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${s.border}`, fontSize: 12 }}>
                            <span style={{ color: s.muted }}>{row.label}</span>
                            <span style={{ color: s.text, fontWeight: 700, textAlign: "right", marginLeft: 12 }}>{row.value}</span>
                          </div>
                        ))}
                      </div>

                      {r.collections.length > 0 && (
                        <>
                          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", color: s.gold, marginBottom: 8 }}>MEMORIES ({r.collections.length})</div>
                          {r.collections.map((c) => (
                            <div key={c.id} style={{ background: "#1C1814", border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: s.text }}>{c.title}</div>
                                <div style={{ fontSize: 11, color: s.dim, marginTop: 2 }}>{c.releasedItems}/{c.totalItems} released{c.latestReleasedAt ? ` · ${new Date(c.latestReleasedAt).toLocaleDateString("en-SG")}` : ""}</div>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: c.releasedItems > 0 ? "rgba(29,158,117,0.15)" : "rgba(107,88,64,0.2)", color: c.releasedItems > 0 ? "#5DCAA5" : s.muted, border: `1px solid ${c.releasedItems > 0 ? "rgba(29,158,117,0.3)" : s.border}` }}>
                                {c.releasedItems}/{c.totalItems}
                              </span>
                            </div>
                          ))}
                        </>
                      )}

                      {!r.isClaimed && hasReleased && (
                        <div style={{ marginTop: 14 }}>
                          {generatedCode ? (
                            <div style={{ background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: 10, padding: 14 }}>
                              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", color: "#5DCAA5", marginBottom: 8 }}>CLAIM CODE GENERATED</div>
                              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, color: "#5DCAA5", fontFamily: "monospace", marginBottom: 8 }}>{generatedCode}</div>
                              <div style={{ fontSize: 11, color: s.dim, marginBottom: 10 }}>Valid for 90 days. Give this to the receiver during your visit.</div>
                              <button onClick={() => navigator.clipboard.writeText(generatedCode)} style={{ background: "rgba(29,158,117,0.2)", border: "1px solid rgba(29,158,117,0.4)", color: "#5DCAA5", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Copy code</button>
                            </div>
                          ) : (
                            <button onClick={() => generateClaimCode(r.id)} disabled={generatingCode === r.id} style={{ background: "rgba(184,150,90,0.15)", border: `1px solid ${s.gold}`, color: s.gold, borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                              {generatingCode === r.id ? "Generating..." : "Generate claim code"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
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
