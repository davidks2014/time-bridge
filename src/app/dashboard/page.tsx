"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  const [showSegmentPicker, setShowSegmentPicker] = useState(false);
  const [modalInitialTitle, setModalInitialTitle] = useState("");
  const [modalInitialItemTitle, setModalInitialItemTitle] = useState("");
  const [modalInitialBody, setModalInitialBody] = useState("");
  const [modalInitialReleaseDate, setModalInitialReleaseDate] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [wizardSelection, setWizardSelection] = useState<"planner" | "parent" | "keeper" | null>(null);
  const [carouselStep, setCarouselStep] = useState<0 | 1 | 2>(0);

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

  function openProtectModal() {
    setModalInitialTitle("My family's safety net");
    setModalInitialItemTitle("Everything my family needs to know");
    setModalInitialBody(
`MY INSURANCE POLICIES
──────────────────────
Policy 1: [Insurance company] | [Policy number] | [Coverage type] | [Agent name & phone]
Policy 2: [Add or remove as needed]

MY CPF & BANK ACCOUNTS
──────────────────────
CPF: [Nominated beneficiaries] | [Approximate balance]
Bank 1: [Bank name] | [Account type] | [Joint holder if any]

MY PROPERTY & ASSETS
──────────────────────
Property: [Address] | [Ownership type] | [Outstanding loan if any]
Vehicle: [Plate number] | [Insurance expiry]
Other assets: [Describe any other assets]

MY IMPORTANT CONTACTS
──────────────────────
Lawyer: [Name] | [Firm] | [Phone]
Doctor: [Name] | [Clinic] | [Phone]
Financial advisor: [Name] | [Company] | [Phone]

MY FINAL WORDS
──────────────────────
[Write anything you want your family to know — your wishes, your love, and your guidance for them]`
    );
    setModalInitialReleaseDate("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setModalInitialTitle("");
    setModalInitialItemTitle("");
    setModalInitialBody("");
    setModalInitialReleaseDate("");
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

  const nextDelivery = memories
    .flatMap(m => m.items
      .filter(item => item.status === "DRAFT" && item.releaseDate)
      .map(item => ({ ...item, memoryTitle: m.title, receiverName: m.receiver.fullName }))
    )
    .sort((a, b) => new Date(a.releaseDate!).getTime() - new Date(b.releaseDate!).getTime())
    .find(item => new Date(item.releaseDate!) > new Date());

  return (
    <div className="tb-page tb-page-with-tabs">

      {/* Create Memory Modal */}
      {showModal && (
        <CreateMemoryModal
          onClose={closeModal}
          onSuccess={() => { closeModal(); loadDashboard(); }}
          initialCollectionTitle={modalInitialTitle}
          initialItemTitle={modalInitialItemTitle}
          initialContent={modalInitialBody}
          initialReleaseDate={modalInitialReleaseDate}
        />
      )}

      {/* Segment Picker Modal */}
      {showSegmentPicker && (
        <div
          onClick={() => setShowSegmentPicker(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(44,24,16,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#FAF7F2", borderRadius: 20, padding: "40px 32px",
              maxWidth: 760, width: "100%", position: "relative",
            }}
          >
            {/* Close */}
            <button
              onClick={() => setShowSegmentPicker(false)}
              style={{
                position: "absolute", top: 16, right: 20, background: "none",
                border: "none", fontSize: 22, color: "#B8965A", cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>

            {/* Label */}
            <div style={{
              fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", color: "#B8965A",
              textAlign: "center", marginBottom: 28, textTransform: "uppercase",
            }}>
              WHAT WOULD YOU LIKE TO CREATE?
            </div>

            {/* Cards */}
            <style>{`
              .tb-seg-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
              @media (max-width: 600px) { .tb-seg-cards { grid-template-columns: 1fr !important; } }
            `}</style>
            <div className="tb-seg-cards">
              {([
                {
                  key: "planner",
                  accentColor: "#B8965A",
                  iconBg: "rgba(184,150,90,0.1)",
                  num: "01",
                  title: "Protect my family",
                  body: "Make sure they know everything I have prepared — my insurance, assets, and the words I want them to receive.",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  ),
                  action: () => { setShowSegmentPicker(false); openProtectModal(); },
                },
                {
                  key: "parent",
                  accentColor: "#7C9A7E",
                  iconBg: "rgba(124,154,126,0.1)",
                  num: "02",
                  title: "A letter to my child",
                  body: "Deliver my love at exactly the right moment — their 18th birthday, graduation day, or wedding.",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C9A7E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  ),
                  action: () => { setShowSegmentPicker(false); router.push("/milestone"); },
                },
                {
                  key: "keeper",
                  accentColor: "#B8965A",
                  iconBg: "rgba(184,150,90,0.1)",
                  num: "03",
                  title: "Schedule a memory",
                  body: "Write a message, add photos or videos, and choose when someone special receives it.",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  ),
                  action: () => { setShowSegmentPicker(false); setShowModal(true); },
                },
              ] as const).map((card) => (
                <div
                  key={card.key}
                  onClick={card.action}
                  style={{
                    background: "#fff", border: "1px solid rgba(184,150,90,0.2)", borderRadius: 20,
                    padding: "40px 28px 32px", display: "flex", flexDirection: "column",
                    alignItems: "center", textAlign: "center", cursor: "pointer",
                    transition: "border-color 220ms ease, transform 180ms ease", position: "relative", overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(184,150,90,0.5)";
                    e.currentTarget.style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(184,150,90,0.2)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* Top accent bar */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 3,
                    borderRadius: "20px 20px 0 0", background: card.accentColor,
                  }} />

                  {/* Icon */}
                  <div style={{
                    width: 56, height: 56, borderRadius: 16, background: card.iconBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 18, flexShrink: 0,
                  }}>
                    {card.icon}
                  </div>

                  {/* Number */}
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: "rgba(184,150,90,0.4)", marginBottom: 10 }}>
                    {card.num}
                  </div>

                  {/* Title */}
                  <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 26, fontWeight: 600, color: "#2C1810", lineHeight: 1.2, marginBottom: 12 }}>
                    {card.title}
                  </div>

                  {/* Body */}
                  <div style={{ fontSize: 15, color: "#9A8878", lineHeight: 1.85, flex: 1 }}>
                    {card.body}
                  </div>

                  {/* Arrow footer */}
                  <div style={{
                    marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(184,150,90,0.12)",
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "flex-end",
                  }}>
                    <span style={{ fontSize: 18, color: card.accentColor, fontWeight: 400 }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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

        {/* ── Next Delivery hero card ── */}
        {memories.length > 0 && nextDelivery && (() => {
          const releaseMs = new Date(nextDelivery.releaseDate!).getTime();
          const totalDays = Math.ceil((releaseMs - Date.now()) / 86400000);
          const pct = Math.min(100, Math.max(0, ((365 - totalDays) / 365) * 100));
          const formattedRelease = new Date(nextDelivery.releaseDate!).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" });
          return (
            <div className="tb-fade-in tb-stagger-3" style={{
              background: "#fff",
              border: "1px solid rgba(184,150,90,0.2)",
              borderLeft: "4px solid #B8965A",
              borderRadius: 16,
              padding: "20px 24px",
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", color: "#B8965A", marginBottom: 8 }}>
                NEXT DELIVERY
              </div>
              <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, fontWeight: 600, color: "#2C1810", marginBottom: 4 }}>
                {nextDelivery.memoryTitle}
              </div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
                For {nextDelivery.receiverName} · Releases on {formattedRelease}
              </div>
              <div style={{ height: 4, background: "#E8D5B7", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "#B8965A", borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 12, color: "#B8965A", fontWeight: 700 }}>
                {totalDays} days until delivery
              </div>
            </div>
          );
        })()}

        {/* ── Stats ── */}
        {memories.length > 0 && stats && (
          <div className="tb-fade-in tb-stagger-3" style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 28,
          }}>
            {[
              { num: stats.totalMemories,    label: "Memories created", href: "/memory-sent" },
              { num: stats.releasedMemories, label: "Released",         href: "/memory-sent?filter=released" },
              { num: stats.totalReceivers,   label: "Recipients",       href: "/recipients" },
            ].map((s, i) => (
              <div key={i} className="tb-stat-card" style={{ cursor: "pointer" }} onClick={() => router.push(s.href)}>
                <div className="tb-stat-num">{s.num}</div>
                <div className="tb-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Create memory button (returning users only) ── */}
        {memories.length > 0 && <button
          className="tb-fade-in tb-stagger-4"
          onClick={() => setShowSegmentPicker(true)}
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
                  <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.18em", color: "#B8965A", textAlign: "center", marginBottom: 24, opacity: 0.85 }}>
                    WHAT BRINGS YOU TO TIME BRIDGE?
                  </div>

                  {/* Cards */}
                  <style>{`
                    .tb-wizard-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
                    @media (max-width: 600px) { .tb-wizard-cards { grid-template-columns: 1fr !important; } }
                    .tb-wcard { background: #fff; border: 1px solid rgba(184,150,90,0.2); border-radius: 20px; padding: 40px 28px 32px; display: flex; flex-direction: column; align-items: center; text-align: center; cursor: pointer; transition: border-color 220ms ease, background 220ms ease, transform 180ms ease; position: relative; overflow: hidden; }
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
                        title: "Schedule a memory",
                        body: "Write a message, add photos or videos, and choose when someone special receives it.",
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
                          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: selected ? card.accentColor : "rgba(184,150,90,0.4)", marginBottom: 10, transition: "color 220ms" }}>
                            {card.num}
                          </div>

                          {/* Title */}
                          <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 26, fontWeight: 600, color: "#2C1810", lineHeight: 1.2, marginBottom: 12 }}>
                            {card.title}
                          </div>

                          {/* Body */}
                          <div style={{ fontSize: 15, color: "#9A8878", lineHeight: 1.85, flex: 1 }}>
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
                      onClick={() => {
                        if (wizardSelection) {
                          if (!profileComplete) {
                            setWizardStep(2);
                          } else if (!isApproved) {
                            setWizardStep(2);
                          } else {
                            setWizardStep(2);
                          }
                        }
                      }}
                      disabled={!wizardSelection}
                      style={{
                        background: "#2C1810",
                        color: "#FAF7F2",
                        border: "none",
                        borderRadius: 12,
                        padding: "19px 0",
                        fontSize: 16,
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
                        ? `Begin — ${{ planner: "Protect my family", parent: "A letter to my child", keeper: "Schedule a memory" }[wizardSelection]} →`
                        : "Choose how to begin"}
                    </button>
                    <div style={{ marginTop: 12, fontSize: 13, color: "rgba(184,150,90,0.65)", letterSpacing: "0.04em" }}>
                      You can always create different memories later
                    </div>
                  </div>
                </>
              ) : (
                !profileComplete ? (
                  <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0", textAlign: "center" }}>
                    <button onClick={() => setWizardStep(1)} style={{ fontSize: 13, color: "#B8965A", background: "none", border: "none", cursor: "pointer", fontWeight: 600, marginBottom: 32, display: "block" }}>← Back</button>
                    <div style={{ width: 80, height: 80, borderRadius: 20, background: "rgba(184,150,90,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", color: "#B8965A", marginBottom: 16 }}>ONE MORE STEP BEFORE YOU BEGIN</div>
                    <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 34, fontWeight: 400, color: "#2C1810", lineHeight: 1.25, marginBottom: 16 }}>Complete your profile to start creating memories.</div>
                    <div style={{ fontSize: 16, color: "#888", lineHeight: 1.85, fontWeight: 300, maxWidth: 440, margin: "0 auto 28px" }}>Time Bridge is built on trust. Before you can create and deliver memories to your loved ones, we need to verify who you are.</div>
                    <div style={{ background: "#fff", border: "1px solid rgba(184,150,90,0.2)", borderRadius: 16, padding: "24px 28px", margin: "0 auto 28px", maxWidth: 480, textAlign: "left" }}>
                      {[
                        {
                          icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
                          title: "Protect your recipients",
                          subtitle: "Verification ensures only real, verified people can send memories. Your family deserves to know the messages they receive are genuinely from you.",
                        },
                        {
                          icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
                          title: "Keep your memories safe",
                          subtitle: "Your NRIC is used for identity verification only. It is encrypted and never shared with anyone — including your recipients.",
                        },
                        {
                          icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></svg>),
                          title: "PDPA compliant",
                          subtitle: "Time Bridge is fully compliant with Singapore's Personal Data Protection Act. Your data is yours — always.",
                        },
                      ].map((row, i, arr) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: i < arr.length - 1 ? 16 : 0 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(184,150,90,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {row.icon}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#2C1810", marginBottom: 4 }}>{row.title}</div>
                            <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>{row.subtitle}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => router.push("/complete-profile")} style={{ width: "100%", maxWidth: 440, background: "#2C1810", color: "#FAF7F2", border: "none", borderRadius: 10, padding: "16px", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em" }}>Complete my profile →</button>
                    <div style={{ fontSize: 12, color: "rgba(184,150,90,0.65)", marginTop: 12 }}>Takes less than 2 minutes · Your information is encrypted and secure</div>
                  </div>
                ) : !isApproved ? (
                  <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0", textAlign: "center" }}>
                    <style>{`@keyframes tb-pulse-badge { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
                    <button onClick={() => setWizardStep(1)} style={{ fontSize: 13, color: "#B8965A", background: "none", border: "none", cursor: "pointer", fontWeight: 600, marginBottom: 32, display: "block" }}>← Back</button>
                    <div style={{ width: 80, height: 80, borderRadius: 20, background: "rgba(124,154,126,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7C9A7E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,154,126,0.12)", border: "1px solid rgba(124,154,126,0.3)", borderRadius: 20, padding: "8px 16px", marginBottom: 24 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C9A7E", animation: "tb-pulse-badge 2s ease-in-out infinite" }} />
                      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", color: "#7C9A7E" }}>VERIFICATION IN PROGRESS</span>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", color: "#B8965A", marginBottom: 16 }}>YOUR PROFILE IS BEING REVIEWED</div>
                    <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 34, fontWeight: 400, color: "#2C1810", lineHeight: 1.25, marginBottom: 16 }}>You are almost there.</div>
                    <div style={{ fontSize: 16, color: "#888", lineHeight: 1.85, fontWeight: 300, maxWidth: 440, margin: "0 auto 28px" }}>Our team is reviewing your verification documents. This usually takes less than 24 hours. We will notify you by email once approved.</div>
                    <div style={{ background: "#fff", border: "1px solid rgba(124,154,126,0.2)", borderRadius: 16, padding: "24px 28px", margin: "0 auto 28px", maxWidth: 480, textAlign: "left" }}>
                      {[
                        {
                          icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C9A7E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.09 6.09l.86-1.35a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15z"/></svg>),
                          title: "What happens next?",
                          subtitle: "Once approved, you will receive an email and can immediately start creating memories for your loved ones.",
                        },
                        {
                          icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C9A7E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>),
                          title: "Check your email",
                          subtitle: "We will send a notification to your registered email address the moment your account is approved.",
                        },
                      ].map((row, i, arr) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: i < arr.length - 1 ? 16 : 0 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(124,154,126,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {row.icon}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#2C1810", marginBottom: 4 }}>{row.title}</div>
                            <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>{row.subtitle}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => router.push("/pending-verification")} style={{ width: "100%", maxWidth: 440, background: "#7C9A7E", color: "#FAF7F2", border: "none", borderRadius: 10, padding: "16px", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em" }}>Check my verification status</button>
                    <div style={{ fontSize: 12, color: "rgba(184,150,90,0.65)", marginTop: 12 }}>Most accounts are approved within 24 hours</div>
                  </div>
                ) : (
                <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 0" }}>
                  {/* Progress dots */}
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 48 }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{
                        width: carouselStep === i ? 24 : 8,
                        height: 8,
                        borderRadius: carouselStep === i ? 4 : "50%",
                        background: carouselStep === i ? "#B8965A" : "rgba(184,150,90,0.25)",
                        transition: "all 300ms",
                      }} />
                    ))}
                  </div>

                  {/* Slide content */}
                  {wizardSelection && (() => {
                    const allSlides: Record<"planner" | "parent" | "keeper", Array<{
                      stepLabel: string;
                      heading: string;
                      body: string;
                      icon?: React.ReactNode;
                      iconBg?: string;
                      howItWorks?: boolean;
                      steps?: string[];
                      sublabels?: string[];
                      accentColor?: string;
                    }>> = {
                      planner: [
                        {
                          stepLabel: "YOUR PROTECTION PLAN",
                          iconBg: "rgba(184,150,90,0.1)",
                          icon: (
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                          ),
                          heading: "Your family deserves to know everything you prepared.",
                          body: "You have insurance, savings, and plans — but if something happens suddenly, will your family know where to find them? Time Bridge makes sure they do.",
                        },
                        {
                          stepLabel: "HOW IT WORKS",
                          heading: "Simple. Secure. Delivered when it matters.",
                          body: "You write your message and list your policies and assets. We keep it safe. When proof-of-life is missed, your family receives everything you prepared.",
                          howItWorks: true,
                          steps: ["You create", "We hold it", "We deliver"],
                          sublabels: ["Your memory & instructions", "Safe and encrypted", "To your family when needed"],
                          accentColor: "#B8965A",
                        },
                        {
                          stepLabel: "YOU ARE IN CONTROL",
                          iconBg: "rgba(44,24,16,0.07)",
                          icon: (
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2C1810" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                              <polyline points="9,12 11,14 15,10"/>
                            </svg>
                          ),
                          heading: "Nothing is sent without your permission.",
                          body: "You can edit, update, or delete your memories anytime. Your family only receives them when you decide — or when you are no longer here to check in.",
                        },
                      ],
                      parent: [
                        {
                          stepLabel: "YOUR LOVE, DELIVERED",
                          iconBg: "rgba(124,154,126,0.12)",
                          icon: (
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7C9A7E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                          ),
                          heading: "Some words are too important to leave unsaid.",
                          body: "You love your child deeply — but saying 'I love you' out loud is hard. Time Bridge gives you a private, safe space to write everything you want them to know.",
                        },
                        {
                          stepLabel: "HOW IT WORKS",
                          heading: "Your words arrive at exactly the right moment.",
                          body: "Write your letter today. Choose your child's 18th birthday, graduation day, or wedding. On that day, they receive your words — from you, across time.",
                          howItWorks: true,
                          steps: ["You write", "You set a date", "They receive it"],
                          sublabels: ["Your letter & memories", "Their 18th, graduation, wedding", "At the perfect moment"],
                          accentColor: "#7C9A7E",
                        },
                        {
                          stepLabel: "ALWAYS YOURS",
                          iconBg: "rgba(124,154,126,0.12)",
                          icon: (
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7C9A7E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                              <polyline points="9,12 11,14 15,10"/>
                            </svg>
                          ),
                          heading: "Your letter stays private until you choose.",
                          body: "Only you can see your memories. Add photos, videos, and notes. Edit anytime. Your child receives exactly what you want them to — nothing more, nothing less.",
                        },
                      ],
                      keeper: [
                        {
                          stepLabel: "YOUR MEMORIES",
                          iconBg: "rgba(184,150,90,0.1)",
                          icon: (
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                              <circle cx="12" cy="13" r="4"/>
                            </svg>
                          ),
                          heading: "Every memory deserves to be shared.",
                          body: "Write a message, attach photos or videos, choose a recipient, and decide when they receive it — now or at a future date you choose.",
                        },
                        {
                          stepLabel: "HOW IT WORKS",
                          heading: "Create once. Cherished forever.",
                          body: "Upload your photos and videos, write your message, and choose who receives it. Share it now or schedule it for a future date — entirely up to you.",
                          howItWorks: true,
                          steps: ["You capture", "We store it", "They receive it"],
                          sublabels: ["Photos, videos, words", "Safe forever", "Now or in the future"],
                          accentColor: "#B8965A",
                        },
                        {
                          stepLabel: "SHARE WITH LOVE",
                          iconBg: "rgba(184,150,90,0.1)",
                          icon: (
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                          ),
                          heading: "You are in control of every delivery.",
                          body: "Set a release date or let proof-of-life decide. Edit anytime. Your recipient receives exactly what you want, when you want.",
                        },
                      ],
                    };

                    const slide = allSlides[wizardSelection][carouselStep];

                    const howItWorksIcons: Record<number, React.ReactNode> = {
                      0: (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={slide.accentColor ?? "#B8965A"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                      ),
                      1: wizardSelection === "parent"
                        ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={slide.accentColor ?? "#B8965A"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                        )
                        : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={slide.accentColor ?? "#B8965A"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        ),
                      2: (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={slide.accentColor ?? "#B8965A"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
                        </svg>
                      ),
                    };

                    return (
                      <div key={carouselStep} className="tb-fade-in">
                        {slide.howItWorks ? (
                          <>
                            {/* How It Works visual */}
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 0, maxWidth: 420, margin: "0 auto 40px" }}>
                              {(slide.steps ?? []).map((step, si) => (
                                <>
                                  <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: "#fff", border: "1px solid rgba(184,150,90,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      {howItWorksIcons[si]}
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#2C1810", textAlign: "center" }}>{step}</div>
                                    <div style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 3 }}>{slide.sublabels?.[si]}</div>
                                  </div>
                                  {si < 2 && <div key={`arrow-${si}`} style={{ color: "rgba(184,150,90,0.4)", fontSize: 20, flexShrink: 0, marginBottom: 32 }}>→</div>}
                                </>
                              ))}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.18em", color: "#B8965A", textAlign: "center", marginBottom: 16, textTransform: "uppercase" }}>{slide.stepLabel}</div>
                            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 36, fontWeight: 400, color: "#2C1810", textAlign: "center", lineHeight: 1.25, marginBottom: 16 }}>{slide.heading}</div>
                            <div style={{ fontSize: 17, color: "#888", lineHeight: 1.85, textAlign: "center", maxWidth: 480, margin: "0 auto 40px", fontWeight: 300 }}>{slide.body}</div>
                          </>
                        ) : (
                          <>
                            <div style={{ width: 80, height: 80, borderRadius: 20, background: slide.iconBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px" }}>
                              {slide.icon}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.18em", color: "#B8965A", textAlign: "center", marginBottom: 16, textTransform: "uppercase" }}>{slide.stepLabel}</div>
                            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 36, fontWeight: 400, color: "#2C1810", textAlign: "center", lineHeight: 1.25, marginBottom: 16 }}>{slide.heading}</div>
                            <div style={{ fontSize: 17, color: "#888", lineHeight: 1.85, textAlign: "center", maxWidth: 480, margin: "0 auto 40px", fontWeight: 300 }}>{slide.body}</div>
                          </>
                        )}

                        {/* Navigation */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                          <button
                            onClick={() => {
                              if (carouselStep === 0) { setWizardStep(1); setCarouselStep(0); }
                              else setCarouselStep((s) => (s - 1) as 0 | 1 | 2);
                            }}
                            style={{ background: "none", border: "none", fontSize: 14, color: "#B8965A", cursor: "pointer", fontWeight: 600 }}
                          >
                            ← Back
                          </button>
                          {carouselStep < 2 ? (
                            <button
                              onClick={() => setCarouselStep((s) => (s + 1) as 0 | 1 | 2)}
                              style={{ background: "#2C1810", color: "#FAF7F2", border: "none", borderRadius: 10, padding: "14px 40px", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" }}
                            >
                              Next →
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (wizardSelection === "parent") {
                                  router.push("/milestone");
                                } else if (wizardSelection === "planner") {
                                  openProtectModal();
                                } else {
                                  setShowModal(true);
                                }
                              }}
                              style={{ background: "#B8965A", color: "#FAF7F2", border: "none", borderRadius: 10, padding: "14px 40px", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" }}
                            >
                              {wizardSelection === "parent"
                                ? "Write my first letter →"
                                : wizardSelection === "planner"
                                ? "Create my family's safety net →"
                                : "Let's create my first memory →"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                )
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
