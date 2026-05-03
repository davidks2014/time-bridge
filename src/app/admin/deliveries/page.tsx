"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type DeliveryAttempt = {
  id: string;
  channel: string;
  status: string;
  notes: string | null;
  attemptedAt: string;
  receiver: {
    id: string;
    fullName: string;
    identificationNo: string;
    email: string | null;
    linkedUserId: string | null;
  };
};

const s = {
  page: "#1C1814", card: "#2C2416", border: "#3D3020",
  text: "#F0E8D8", muted: "#9B8060", dim: "#6B5840", gold: "#B8965A",
};

function statusStyle(status: string) {
  if (status === "DELIVERED" || status === "SENT") return { bg: "rgba(29,158,117,0.15)", text: "#5DCAA5", border: "rgba(29,158,117,0.3)" };
  if (status === "FAILED") return { bg: "rgba(226,75,74,0.15)", text: "#F09595", border: "rgba(226,75,74,0.3)" };
  return { bg: "rgba(107,88,64,0.2)", text: "#9B8060", border: "#3D3020" };
}

function channelLabel(channel: string) {
  if (channel === "EMAIL") return "Email";
  if (channel === "GUARDIAN") return "Guardian";
  if (channel === "TRUSTED_CONTACT") return "Trusted contact";
  if (channel === "ADMIN") return "Admin visit";
  return channel;
}

export default function AdminDeliveriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [attempts, setAttempts] = useState<DeliveryAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "DELIVERED" | "FAILED" | "PENDING">("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const role = (session?.user as any)?.role;

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => {
    if (status === "authenticated" && role && role !== "ADMIN") router.replace("/dashboard");
  }, [status, role, router]);

  const loadAttempts = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/admin/deliveries?status=${filter}`);
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Failed."); return; }
      setAttempts(json.attempts ?? []);
    } catch { setError("Network error."); } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { if (status === "authenticated" && role === "ADMIN") loadAttempts(); }, [status, role, loadAttempts]);

  const filtered = attempts.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.receiver.fullName.toLowerCase().includes(q) ||
      a.receiver.identificationNo.toLowerCase().includes(q) ||
      (a.receiver.email ?? "").toLowerCase().includes(q);
  });

  if (status === "loading") return <TimeBridgeLoading message="Loading delivery attempts..." />;

  return (
    <div style={{ minHeight: "100vh", background: s.page, padding: "24px 20px 48px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${s.border}` }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: s.gold, marginBottom: 4 }}>DELIVERY ATTEMPTS</div>
            <div style={{ fontSize: 13, color: s.muted }}>{filtered.length} attempts shown (last 100)</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => router.push("/admin")} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>← Admin home</button>
            <button onClick={loadAttempts} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>↻ Refresh</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            placeholder="Search by receiver name, NRIC or email..."
            style={{ flex: 1, background: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px", color: s.text, fontSize: 13, fontFamily: "var(--font-body)", outline: "none" }}
          />
          <button onClick={() => setSearch(searchInput)} style={{ background: "rgba(184,150,90,0.15)", border: `1px solid ${s.gold}`, color: s.gold, borderRadius: 8, padding: "10px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Search</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {(["ALL", "DELIVERED", "FAILED", "PENDING"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
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
            {[0,1,2].map((i) => <div key={i} style={{ height: 72, borderRadius: 10, background: s.card, opacity: 0.5 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: s.muted }}>
            <div style={{ fontSize: 15, fontFamily: "var(--font-display)", color: s.text }}>No delivery attempts found</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((attempt) => {
              const ss = statusStyle(attempt.status);
              return (
                <div key={attempt.id} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: s.text }}>{channelLabel(attempt.channel)}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: ss.bg, color: ss.text, border: `1px solid ${ss.border}` }}>{attempt.status}</span>
                        {attempt.receiver.linkedUserId && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(29,158,117,0.15)", color: "#5DCAA5", border: "1px solid rgba(29,158,117,0.3)" }}>Claimed</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: s.text, marginBottom: 2 }}>{attempt.receiver.fullName}</div>
                      <div style={{ fontSize: 12, color: s.muted }}>{attempt.receiver.identificationNo} · {attempt.receiver.email ?? "No email"}</div>
                      {attempt.notes && <div style={{ fontSize: 12, color: s.dim, marginTop: 6, lineHeight: 1.6 }}>{attempt.notes}</div>}
                    </div>
                    <div style={{ fontSize: 11, color: s.dim, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {new Date(attempt.attemptedAt).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })} SGT
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
