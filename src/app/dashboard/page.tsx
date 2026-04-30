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
  storageUsedMB: number;
  storageLimitMB: number;
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
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [wizardSelection, setWizardSelection] = useState<"planner" | "parent" | "keeper" | null>(null);

  const role         = (session?.user as any)?.role;
  const proofStage   = (session?.user as any)?.proofOfLifeStage ?? "NORMAL";
  const verStatus    = (session?.user as any)?.verificationStatus;
  const rejectReason = (session?.user as any)?.rejectReason as string | null | undefined;
  const profileComplete = (session?.user as any)?.profileComplete;
  const userName     = session?.user?.name ?? "Friend";
  const isApproved   = verStatus === "APPROVED" || role === "ADMIN";

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

  const proofInfo  = getProofStatus(proofStage);
  const firstName  = userName.split(" ")[0];
  const storagePct = stats
    ? Math.min((stats.storageUsedMB / stats.storageLimitMB) * 100, 100)
    : 0;

  const hour = new Date().getHours();
  const greeting    = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const timeOfDay   = hour < 12 ? "morning"      : hour < 17 ? "afternoon"      : "evening";

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
        {memories.length > 0 && (
        <div className="tb-fade-in" style={{ marginBottom: 28 }}>
          <h1 style={{ marginBottom: 4 }}>
            {greeting}, {firstName}
          </h1>
          <p style={{ color: "var(--earth-muted)", fontSize: 14 }}>
            Your legacy is safely held — {memories.length} {memories.length === 1 ? "memory" : "memories"} created
          </p>
        </div>
        )}

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

        {/* ── Verification pending banner (profile submitted, awaiting review) ── */}
        {verStatus === "PENDING" && profileComplete && (
          <div className="tb-banner tb-banner-info tb-fade-in tb-stagger-1" style={{ marginBottom: 20 }}>
            <div className="tb-banner-dot tb-banner-dot-blue" />
            <span>Your account is under review. You will be notified by email once approved.</span>
          </div>
        )}

        {/* ── Proof of life banner ── */}
        {memories.length > 0 && <div className="tb-fade-in tb-stagger-2" style={{
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
        </div>}

        {/* ── Storage warning banner (danger: full) ── */}
        {stats && storagePct >= 100 && (
          <div className="tb-banner tb-fade-in tb-stagger-2" style={{
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
              <span style={{ color: "#7F1D1D", fontSize: 13 }}>
                Your storage is full ({stats.storageLimitMB} MB used). You cannot upload new files. Please delete some memories or upgrade your plan.
              </span>
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => router.push("/profile")}
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
                  Upgrade storage
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Storage warning banner (warning: 80–99%) ── */}
        {stats && storagePct >= 80 && storagePct < 100 && (
          <div className="tb-banner tb-banner-gold tb-fade-in tb-stagger-2" style={{ marginBottom: 20 }}>
            <div className="tb-banner-dot tb-banner-dot-gold" />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13 }}>
                You are using {storagePct.toFixed(1)}% of your storage ({stats.storageUsedMB.toFixed(2)} MB of {stats.storageLimitMB} MB). Consider upgrading your plan to avoid losing access.
              </span>
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => router.push("/profile")}
                  style={{
                    background: "transparent",
                    color: "var(--gold)",
                    border: "1px solid var(--gold)",
                    borderRadius: "var(--radius-sm)",
                    padding: "6px 14px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    letterSpacing: "0.5px",
                  }}
                >
                  Upgrade storage
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        {memories.length > 0 && stats && (
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

        {/* ── Create memory button (returning users only) ── */}
        {memories.length > 0 && <button
          className="tb-fade-in tb-stagger-4"
          onClick={() => setShowModal(true)}
          disabled={!isApproved}
          title={!isApproved ? "Account verification required" : undefined}
          style={{
            width: "100%",
            background: "var(--earth)",
            color: "var(--ivory)",
            border: "none",
            borderRadius: "var(--radius-lg)",
            padding: "18px 24px",
            cursor: !isApproved ? "not-allowed" : "pointer",
            opacity: !isApproved ? 0.5 : 1,
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
            if (isApproved) {
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
        </button>}

        {/* ── Memory list ── */}
        {memories.length > 0 && <div className="tb-section-label">Your memories</div>}

        {memories.length === 0 ? (
          stats ? (
            <div className="tb-fade-in" style={{ maxWidth: 860, margin: "0 auto", padding: "32px 0" }}>
              {wizardStep === 1 ? (
                <>
                  {/* Section label */}
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.18em", color: "#B8965A", textAlign: "center", marginBottom: 24, opacity: 0.85 }}>
                    WHAT BRINGS YOU TO TIME BRIDGE?
                  </div>

                  {/* Cards */}
                  <style>{`
                    .tb-wizard-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
                    @media (max-width: 600px) { .tb-wizard-cards { grid-template-columns: 1fr !important; } }
                    .tb-wcard { background: #fff; border: 1px solid rgba(184,150,90,0.2); border-radius: 20px; padding: 36px 24px 28px; display: flex; flex-direction: column; align-items: center; text-align: center; cursor: pointer; transition: border-color 220ms ease, background 220ms ease, transform 180ms ease; position: relative; overflow: hidden; }
                    .tb-wcard:hover { transform: translateY(-3px); border-color: rgba(184,150,90,0.5); }
                    .tb-wcard.sel-gold { background: #FAF7F2; border: 1.5px solid #B8965A; }
                    .tb-wcard.sel-sage { background: #FAF7F2; border: 1.5px solid #7C9A7E; }
                  `}</style>

                  <div className="tb-wizard-cards">
                    {([
                      {
                        key: "planner" as const,
                        num: "01",
                        accentColor: "#B8965A",
                        iconBg: "rgba(184,150,90,0.1)",
                        selClass: "sel-gold",
                        title: "Protect my family",
                        body: "Make sure they know everything I have prepared — my insurance, assets, and the words I want them to receive.",
                        icon: (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          </svg>
                        ),
                      },
                      {
                        key: "parent" as const,
                        num: "02",
                        accentColor: "#7C9A7E",
                        iconBg: "rgba(124,154,126,0.1)",
                        selClass: "sel-sage",
                        title: "A letter to my child",
                        body: "Deliver my love at exactly the right moment — their 18th birthday, graduation day, or wedding.",
                        icon: (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C9A7E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                          </svg>
                        ),
                      },
                      {
                        key: "keeper" as const,
                        num: "03",
                        accentColor: "#B8965A",
                        iconBg: "rgba(184,150,90,0.1)",
                        selClass: "sel-gold",
                        title: "Capture a moment",
                        body: "Preserve the memories that matter and share them with the people I love, now or in the future.",
                        icon: (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                          </svg>
                        ),
                      },
                    ] as const).map((card) => {
                      const selected = wizardSelection === card.key;
                      return (
                        <div
                          key={card.key}
                          className={`tb-wcard${selected ? ` ${card.selClass}` : ""}`}
                          onClick={() => setWizardSelection(card.key)}
                        >
                          {/* Top accent bar */}
                          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "20px 20px 0 0", background: card.accentColor, opacity: selected ? 1 : 0, transition: "opacity 220ms" }} />

                          {/* Icon */}
                          <div style={{ width: 56, height: 56, borderRadius: 16, background: selected ? "#2C1810" : card.iconBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, transition: "background 220ms", flexShrink: 0 }}>
                            {card.icon}
                          </div>

                          {/* Number */}
                          <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.16em", color: selected ? card.accentColor : "rgba(184,150,90,0.4)", marginBottom: 10, transition: "color 220ms" }}>
                            {card.num}
                          </div>

                          {/* Title */}
                          <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, fontWeight: 600, color: "#2C1810", lineHeight: 1.2, marginBottom: 12 }}>
                            {card.title}
                          </div>

                          {/* Body */}
                          <div style={{ fontSize: 13, color: "#9A8878", lineHeight: 1.85, flex: 1 }}>
                            {card.body}
                          </div>

                          {/* Footer */}
                          <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(184,150,90,0.12)", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.12em", color: card.accentColor, opacity: selected ? 1 : 0, transition: "opacity 220ms" }}>
                              SELECTED
                            </div>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: selected ? card.accentColor : "transparent", border: `1.5px solid ${selected ? card.accentColor : "rgba(184,150,90,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 220ms" }}>
                              {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* CTA button */}
                  <div style={{ marginTop: 32, textAlign: "center" }}>
                    <button
                      onClick={() => { if (wizardSelection) setWizardStep(2); }}
                      disabled={!wizardSelection}
                      style={{
                        background: "#2C1810",
                        color: "#FAF7F2",
                        border: "none",
                        borderRadius: 12,
                        padding: "17px 0",
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        cursor: wizardSelection ? "pointer" : "not-allowed",
                        width: "100%",
                        maxWidth: 440,
                        opacity: wizardSelection ? 1 : 0.35,
                        transition: "opacity 200ms ease",
                        fontFamily: "Lato, sans-serif",
                      }}
                    >
                      {wizardSelection
                        ? `Begin — ${{ planner: "Protect my family", parent: "A letter to my child", keeper: "Capture a moment" }[wizardSelection]} →`
                        : "Choose how to begin"}
                    </button>
                    <div style={{ marginTop: 12, fontSize: 11, color: "rgba(184,150,90,0.65)", letterSpacing: "0.04em" }}>
                      You can always create different memories later
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setWizardStep(1)}
                    style={{ background: "none", border: "none", color: "#B8965A", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0, marginBottom: 24, display: "inline-block" }}
                  >
                    ← Back
                  </button>
                  {wizardSelection && (() => {
                    const content = {
                      planner: {
                        heading: "Let's protect your family",
                        body: "Start by documenting everything your family needs to know — your insurance, your assets, and your final words. We will make sure they receive it.",
                        cta: "Create my family's safety net →",
                      },
                      parent: {
                        heading: "A letter to your child",
                        body: "Create your first milestone memory. Choose a moment in your child's future and write the words you want them to receive — on their birthday, graduation, or wedding day.",
                        cta: "Write my first letter →",
                      },
                      keeper: {
                        heading: "Let's preserve a moment",
                        body: "Create your first memory and start building a legacy of moments for the people who matter most.",
                        cta: "Create my first memory →",
                      },
                    }[wizardSelection];
                    return (
                      <div style={{ textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
                        <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 28, fontWeight: 400, color: "#2C1810" }}>
                          {content.heading}
                        </div>
                        <div style={{ fontSize: 15, color: "#666", lineHeight: 1.7, marginTop: 12, marginBottom: 32 }}>
                          {content.body}
                        </div>
                        <button
                          onClick={() => setShowModal(true)}
                          style={{
                            width: "100%",
                            background: "#2C1810",
                            color: "#FAF7F2",
                            border: "none",
                            borderRadius: 10,
                            padding: "14px",
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: "pointer",
                            letterSpacing: "0.04em",
                            transition: "all 200ms ease",
                            fontFamily: "var(--font-body)",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.99)"; }}
                          onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                        >
                          {content.cta}
                        </button>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          ) : (
            <div className="tb-fade-in" style={{ maxWidth: 680, margin: "0 auto", padding: "40px 0" }}>
              <style>{`@keyframes tb-skeleton-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ height: 180, borderRadius: 16, background: "#E8D5B7", animation: `tb-skeleton-pulse 1.6s ease-in-out ${i * 0.15}s infinite` }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ height: 44, width: 200, borderRadius: 8, background: "#E8D5B7", animation: "tb-skeleton-pulse 1.6s ease-in-out 0.45s infinite" }} />
              </div>
            </div>
          )
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

        {/* ── Quick actions (APPROVED only) ── */}
        {isApproved && memories.length > 0 && (
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
// deploy
