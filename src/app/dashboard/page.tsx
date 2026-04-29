"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";
import CreateMemoryModal from "@/components/CreateMemoryModal";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  };
  items: MemoryItem[];
};

type DashboardStats = {
  totalMemories: number;
  releasedMemories: number;
  totalReceivers: number;
};

// ── Helper ────────────────────────────────────────────────────────────────────

function getProofStatus(stage: string) {
  if (stage === "CRITICAL") return {
    dot: "critical", bg: "#FEF2F2", border: "#FECACA",
    text: "Urgent — please confirm you are here immediately",
    color: "#7F1D1D",
  };
  if (stage === "WARNING") return {
    dot: "warning", bg: "var(--gold-pale)", border: "var(--gold-light)",
    text: "Reminder — your proof-of-life check is overdue",
    color: "var(--earth-mid)",
  };
  return {
    dot: "", bg: "var(--sage-pale)", border: "var(--sage-light)",
    text: "All good — your memories are being held safely",
    color: "#2A4A2A",
  };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [memories, setMemories]   = useState<Memory[]>([]);
  const [stats, setStats]         = useState<DashboardStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");

  const role         = (session?.user as any)?.role;
  const proofStage   = (session?.user as any)?.proofOfLifeStage ?? "NORMAL";
  const verStatus    = (session?.user as any)?.verificationStatus;
  const rejectReason = (session?.user as any)?.rejectReason as string | null | undefined;
  const profileComplete = (session?.user as any)?.profileComplete;
  const userName     = session?.user?.name ?? "Friend";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/auth/record-device", { method: "POST" }).catch(() => {});
      loadDashboard();
    }
  }, [status, role]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [memRes, statsRes] = await Promise.all([
        fetch("/api/memory-sent"),
        fetch("/api/dashboard/stats"),
      ]);
      const [memJson, statsJson] = await Promise.all([memRes.json(), statsRes.json()]);
      setMemories(memJson.memories ?? []);
      setStats(statsJson.stats ?? null);
    } catch {
      // silent — page still renders
    } finally {
      setLoading(false);
    }
  }, []);

  async function confirmAlive() {
    setConfirming(true);
    setConfirmMsg("");
    try {
      const res = await fetch("/api/proof-of-life/confirm", { method: "POST" });
      const json = await res.json();
      if (res.ok) setConfirmMsg(json.message ?? "Confirmed. Thank you.");
    } catch {
      setConfirmMsg("Network error. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  if (status === "loading" || loading) {
    return <TimeBridgeLoading message="Loading your memories..." />;
  }

  const proofInfo = getProofStatus(proofStage);
  const firstName = userName.split(" ")[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="tb-page tb-page-with-tabs">

      {/* Create Memory Modal */}
      {showModal && (
        <CreateMemoryModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadDashboard();
          }}
        />
      )}

      <div className="tb-container" style={{ paddingTop: 32, paddingBottom: 48 }}>

        {/* ── Greeting ── */}
        <div className="tb-fade-in" style={{ marginBottom: 28 }}>
          <h1 style={{ marginBottom: 4 }}>
            {greeting}, {firstName}
          </h1>
          <p style={{ color: "var(--earth-muted)", fontSize: 14 }}>
            Your legacy is safely held — {memories.length} {memories.length === 1 ? "memory" : "memories"} created
          </p>
        </div>

        {/* ── Verification rejected banner ── */}
        {verStatus === "REJECTED" && (
          <div className="tb-banner tb-fade-in tb-stagger-1" style={{
            marginBottom: 20,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "var(--radius-md)",
            padding: "14px 18px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}>
            <div className="tb-banner-dot" style={{ background: "#DC2626", marginTop: 4, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <strong style={{ color: "#7F1D1D" }}>Verification rejected</strong>
              {rejectReason && (
                <div style={{ fontSize: 13, color: "#7F1D1D", marginTop: 4 }}>
                  Reason: {rejectReason}
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => router.push("/pending-verification")}
                  style={{
                    background: "#DC2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    padding: "6px 14px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    letterSpacing: "0.5px",
                  }}
                >
                  Resubmit documents
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Profile incomplete banner (not shown for rejected users) ── */}
        {!profileComplete && verStatus !== "REJECTED" && (
          <div className="tb-banner tb-banner-gold tb-fade-in tb-stagger-1" style={{ marginBottom: 20 }}>
            <div className="tb-banner-dot tb-banner-dot-gold" />
            <div style={{ flex: 1 }}>
              <strong>Complete your profile</strong> — Add your NRIC, phone, and address to create memories.
              <button
                onClick={() => router.push("/complete-profile")}
                style={{
                  marginLeft: 12,
                  background: "var(--gold)",
                  color: "var(--ivory)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "4px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.5px",
                }}
              >
                Complete now
              </button>
            </div>
          </div>
        )}

        {/* ── Verification pending banner ── */}
        {verStatus === "PENDING" && (
          <div className="tb-banner tb-banner-info tb-fade-in tb-stagger-1" style={{ marginBottom: 20 }}>
            <div className="tb-banner-dot tb-banner-dot-blue" />
            <span>Your identity is being verified. You can create memories once approved — usually within 1–2 business days.</span>
          </div>
        )}

        {/* ── Proof of life banner ── */}
        <div className="tb-fade-in tb-stagger-2" style={{
          background: proofInfo.bg,
          border: `1px solid ${proofInfo.border}`,
          borderRadius: "var(--radius-md)",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 28,
          flexWrap: "wrap",
        }}>
          <div className={`tb-proof-dot ${proofInfo.dot}`} />
          <span style={{ fontSize: 13, color: proofInfo.color, flex: 1, lineHeight: 1.5 }}>
            {proofInfo.text}
          </span>
          {confirmMsg ? (
            <span style={{ fontSize: 12, color: "var(--sage)", fontWeight: 700 }}>{confirmMsg}</span>
          ) : (
            <button
              className="tb-btn tb-btn-sage"
              onClick={confirmAlive}
              disabled={confirming}
              style={{ padding: "8px 16px", fontSize: 11, letterSpacing: "1px", flexShrink: 0 }}
            >
              {confirming ? "Confirming..." : "I am here ✓"}
            </button>
          )}
        </div>

        {/* ── Stats ── */}
        {stats && (
          <div className="tb-fade-in tb-stagger-3" style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 28,
          }}>
            {[
              { num: stats.totalMemories,   label: "Memories created" },
              { num: stats.releasedMemories, label: "Released" },
              { num: stats.totalReceivers,   label: "Recipients" },
            ].map((s, i) => (
              <div key={i} className="tb-stat-card">
                <div className="tb-stat-num">{s.num}</div>
                <div className="tb-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Create memory button ── */}
        <button
          className="tb-fade-in tb-stagger-4"
          onClick={() => setShowModal(true)}
          disabled={!profileComplete || verStatus === "PENDING"}
          style={{
            width: "100%",
            background: "var(--earth)",
            color: "var(--ivory)",
            border: "none",
            borderRadius: "var(--radius-lg)",
            padding: "18px 24px",
            cursor: !profileComplete || verStatus === "PENDING" ? "not-allowed" : "pointer",
            opacity: !profileComplete || verStatus === "PENDING" ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: 32,
            transition: "all var(--transition)",
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 400,
            letterSpacing: "1px",
          }}
          onMouseEnter={(e) => {
            if (profileComplete && verStatus !== "PENDING") {
              e.currentTarget.style.background = "var(--earth-mid)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "var(--shadow-lift)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--earth)";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <div style={{
            width: 32, height: 32,
            borderRadius: "50%",
            background: "var(--gold)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}>+</div>
          Create a new memory
        </button>

        {/* ── Memory list ── */}
        <div className="tb-section-label">Your memories</div>

        {memories.length === 0 ? (
          <div className="tb-empty tb-fade-in">
            <div style={{ fontSize: 40, marginBottom: 16 }}>💌</div>
            <div className="tb-empty-title">No memories yet</div>
            <div className="tb-empty-body">
              Create your first memory to begin preserving<br/>your legacy for those you love.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {memories.map((memory, i) => {
              const hasReleased = memory.items.some((item) => item.status === "RELEASED");
              const allReleased = memory.items.every((item) => item.status === "RELEASED");
              const nextRelease = memory.items
                .filter((item) => item.status === "DRAFT" && item.releaseDate)
                .sort((a, b) => new Date(a.releaseDate!).getTime() - new Date(b.releaseDate!).getTime())[0];

              return (
                <div
                  key={memory.id}
                  className={`tb-memory-card tb-fade-in ${allReleased ? "released" : "draft"}`}
                  style={{ animationDelay: `${0.05 * i}s` }}
                  onClick={() => router.push(`/memory-sent/${memory.id}`)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 20,
                        fontWeight: 500,
                        color: "var(--earth)",
                        marginBottom: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {memory.title}
                      </div>
                      <div style={{ fontSize: 15, color: "var(--earth-muted)", lineHeight: 1.6 }}>
                        For <strong>{memory.receiver.fullName}</strong>
                        <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
                        {memory.receiver.identificationNo}
                      </div>
                      {nextRelease?.releaseDate && (
                        <div style={{ fontSize: 13, color: "var(--earth-muted)", marginTop: 4 }}>
                          Releases {new Date(nextRelease.releaseDate).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span className={`tb-badge ${allReleased ? "tb-badge-released" : "tb-badge-draft"}`}>
                        {allReleased ? "Released" : hasReleased ? "Partial" : "Draft"}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--earth-muted)" strokeWidth="2" strokeLinecap="round"><polyline points="9,18 15,12 9,6"/></svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Quick actions ── */}
        {memories.length > 0 && (
          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              className="tb-btn tb-btn-outline"
              onClick={() => router.push("/memory-sent")}
              style={{ fontSize: 11, letterSpacing: "0.5px" }}
            >
              View all sent
            </button>
            <button
              className="tb-btn tb-btn-outline"
              onClick={() => router.push("/memory-received")}
              style={{ fontSize: 11, letterSpacing: "0.5px" }}
            >
              View received
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
