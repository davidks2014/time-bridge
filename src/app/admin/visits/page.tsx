"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type Visit = {
  id: string; visitDate: string; outcome: string;
  adminNotes: string | null; claimCode: string | null;
  claimCodeExpiresAt: string | null; conductedBy: string | null; createdAt: string;
  receiver: { id: string; fullName: string; identificationNo: string; email: string | null; address: string; linkedUserId: string | null; };
};

type Receiver = { id: string; fullName: string; identificationNo: string; };

const OUTCOMES = [
  { value: "DELIVERED_AND_ACKNOWLEDGED", label: "Delivered and acknowledged" },
  { value: "LEFT_LETTER_NO_ONE_HOME", label: "Left letter — no one home" },
  { value: "ADDRESS_NOT_FOUND", label: "Address not found" },
  { value: "PERSON_CONFIRMED_NOT_RECEIVER", label: "Person confirmed — not the receiver" },
  { value: "REDIRECTED_TO_GUARDIAN", label: "Redirected to guardian" },
  { value: "OTHER", label: "Other — see notes" },
];

const s = {
  page: "#1C1814", card: "#2C2416", border: "#3D3020",
  text: "#F0E8D8", muted: "#9B8060", dim: "#6B5840", gold: "#B8965A",
};

function outcomeStyle(outcome: string) {
  if (outcome === "DELIVERED_AND_ACKNOWLEDGED") return { bg: "rgba(29,158,117,0.15)", text: "#5DCAA5", border: "rgba(29,158,117,0.3)" };
  if (outcome === "LEFT_LETTER_NO_ONE_HOME") return { bg: "rgba(250,199,117,0.15)", text: "#FAC775", border: "rgba(250,199,117,0.3)" };
  if (outcome === "ADDRESS_NOT_FOUND" || outcome === "PERSON_CONFIRMED_NOT_RECEIVER") return { bg: "rgba(226,75,74,0.15)", text: "#F09595", border: "rgba(226,75,74,0.3)" };
  if (outcome === "REDIRECTED_TO_GUARDIAN") return { bg: "rgba(55,138,221,0.15)", text: "#85B7EB", border: "rgba(55,138,221,0.3)" };
  return { bg: "rgba(107,88,64,0.2)", text: s.muted, border: s.border };
}

export default function AdminVisitsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [outcome, setOutcome] = useState("OTHER");
  const [adminNotes, setAdminNotes] = useState("");
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const role = (session?.user as any)?.role;

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => {
    if (status === "authenticated" && role && role !== "ADMIN") router.replace("/dashboard");
  }, [status, role, router]);

  const loadVisits = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/visits");
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Failed."); return; }
      setVisits(json.visits ?? []);
    } catch { setError("Network error."); } finally { setLoading(false); }
  }, []);

  async function loadReceivers() {
    try {
      const res = await fetch("/api/admin/receivers");
      const json = await res.json();
      if (res.ok) setReceivers((json.receivers ?? []).map((r: any) => ({ id: r.id, fullName: r.fullName, identificationNo: r.identificationNo })));
    } catch {}
  }

  useEffect(() => {
    if (status === "authenticated" && role === "ADMIN") { loadVisits(); loadReceivers(); }
  }, [status, role, loadVisits]);

  async function recordVisit() {
    setFormError(""); setFormSuccess("");
    if (!receiverId) return setFormError("Please select a receiver.");
    if (!adminNotes.trim() && outcome === "OTHER") return setFormError("Please add notes when outcome is Other.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/visits", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, outcome, adminNotes, visitDate }),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json?.error ?? "Failed."); return; }
      setFormSuccess("Visit recorded successfully.");
      setShowForm(false);
      setReceiverId(""); setOutcome("OTHER"); setAdminNotes("");
      await loadVisits();
    } catch { setFormError("Network error."); } finally { setSubmitting(false); }
  }

  const filtered = visits.filter((v) => {
    const q = search.toLowerCase();
    return !q ||
      v.receiver.fullName.toLowerCase().includes(q) ||
      v.receiver.identificationNo.toLowerCase().includes(q) ||
      (v.receiver.email ?? "").toLowerCase().includes(q) ||
      v.outcome.toLowerCase().includes(q);
  });

  const selectStyle: React.CSSProperties = {
    width: "100%", background: "#1C1814", border: `1px solid ${s.border}`,
    borderRadius: 8, padding: "10px 12px", color: s.text, fontSize: 13,
    fontFamily: "var(--font-body)", outline: "none", marginBottom: 10,
  };

  if (status === "loading") return <TimeBridgeLoading message="Loading visit log..." />;

  return (
    <div style={{ minHeight: "100vh", background: s.page, padding: "24px 20px 48px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${s.border}` }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: s.gold, marginBottom: 4 }}>VISIT LOG</div>
            <div style={{ fontSize: 13, color: s.muted }}>{visits.length} visits recorded</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setShowForm((p) => !p); setFormError(""); setFormSuccess(""); }} style={{ background: "rgba(184,150,90,0.15)", border: `1px solid ${s.gold}`, color: s.gold, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>
              {showForm ? "Cancel" : "+ Record visit"}
            </button>
            <button onClick={() => router.push("/admin")} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>← Admin home</button>
            <button onClick={loadVisits} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 700 }}>↻ Refresh</button>
          </div>
        </div>

        {showForm && (
          <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", color: s.gold, marginBottom: 14 }}>RECORD NEW VISIT</div>

            <div style={{ fontSize: 11, color: s.muted, marginBottom: 4, fontWeight: 700 }}>RECEIVER</div>
            <select value={receiverId} onChange={(e) => setReceiverId(e.target.value)} style={selectStyle}>
              <option value="">Select a receiver...</option>
              {receivers.map((r) => (
                <option key={r.id} value={r.id}>{r.fullName} · {r.identificationNo}</option>
              ))}
            </select>

            <div style={{ fontSize: 11, color: s.muted, marginBottom: 4, fontWeight: 700 }}>OUTCOME</div>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)} style={selectStyle}>
              {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <div style={{ fontSize: 11, color: s.muted, marginBottom: 4, fontWeight: 700 }}>VISIT DATE & TIME</div>
            <input
              type="datetime-local" value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              style={{ ...selectStyle, marginBottom: 10 }}
            />

            <div style={{ fontSize: 11, color: s.muted, marginBottom: 4, fontWeight: 700 }}>NOTES</div>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Describe what happened during the visit..."
              rows={3}
              style={{ width: "100%", background: "#1C1814", border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 12px", color: s.text, fontSize: 13, fontFamily: "var(--font-body)", outline: "none", resize: "vertical", boxSizing: "border-box", marginBottom: 14 }}
            />

            {formError && <div style={{ background: "rgba(226,75,74,0.1)", border: "1px solid rgba(226,75,74,0.3)", borderRadius: 8, padding: "8px 12px", color: "#F09595", fontSize: 12, marginBottom: 12 }}>{formError}</div>}
            {formSuccess && <div style={{ background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: 8, padding: "8px 12px", color: "#5DCAA5", fontSize: 12, marginBottom: 12 }}>{formSuccess}</div>}

            <button onClick={recordVisit} disabled={submitting} style={{ background: "rgba(184,150,90,0.2)", border: `1px solid ${s.gold}`, color: s.gold, borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "var(--font-body)" }}>
              {submitting ? "Recording..." : "Record visit"}
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            placeholder="Search by receiver name, NRIC or outcome..."
            style={{ flex: 1, background: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px", color: s.text, fontSize: 13, fontFamily: "var(--font-body)", outline: "none" }}
          />
          <button onClick={() => setSearch(searchInput)} style={{ background: "rgba(184,150,90,0.15)", border: `1px solid ${s.gold}`, color: s.gold, borderRadius: 8, padding: "10px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Search</button>
        </div>

        {error && <div style={{ background: "rgba(226,75,74,0.1)", border: "1px solid rgba(226,75,74,0.3)", borderRadius: 8, padding: "10px 14px", color: "#F09595", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[0,1,2].map((i) => <div key={i} style={{ height: 80, borderRadius: 10, background: s.card, opacity: 0.5 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: s.muted }}>
            <div style={{ fontSize: 15, fontFamily: "var(--font-display)", color: s.text }}>No visits recorded</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Use "Record visit" to log physical delivery attempts</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((visit) => {
              const os = outcomeStyle(visit.outcome);
              const outcomeLabel = OUTCOMES.find((o) => o.value === visit.outcome)?.label ?? visit.outcome;
              return (
                <div key={visit.id} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: os.bg, color: os.text, border: `1px solid ${os.border}` }}>
                          {outcomeLabel}
                        </span>
                        {visit.claimCode && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: "rgba(29,158,117,0.15)", color: "#5DCAA5", border: "1px solid rgba(29,158,117,0.3)", fontFamily: "monospace" }}>
                            Code: {visit.claimCode}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: s.text, marginBottom: 2 }}>{visit.receiver.fullName}</div>
                      <div style={{ fontSize: 12, color: s.muted, marginBottom: 4 }}>
                        {visit.receiver.identificationNo} · {visit.receiver.email ?? "No email"}
                      </div>
                      <div style={{ fontSize: 11, color: s.dim, lineHeight: 1.5 }}>{visit.receiver.address}</div>
                      {visit.adminNotes && (
                        <div style={{ fontSize: 12, color: s.dim, marginTop: 8, padding: "6px 10px", background: "#1C1814", borderRadius: 6, lineHeight: 1.6 }}>
                          {visit.adminNotes}
                        </div>
                      )}
                      {visit.conductedBy && (
                        <div style={{ fontSize: 11, color: s.dim, marginTop: 6 }}>By: {visit.conductedBy}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: s.dim, whiteSpace: "nowrap", flexShrink: 0, textAlign: "right" }}>
                      <div>{new Date(visit.visitDate).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })} SGT</div>
                      {visit.receiver.linkedUserId && (
                        <div style={{ marginTop: 4, color: "#5DCAA5", fontWeight: 700 }}>✓ Claimed</div>
                      )}
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
