/**
 * Page: /milestone
 *
 * Purpose: Guided milestone memory wizard for "A letter to my child" segment.
 * Walks the parent through 3 steps:
 *   Step 1 — Child's name and date of birth
 *   Step 2 — Milestone selection (18th birthday, graduation, wedding, custom)
 *   Step 3 — Summary and confirmation before opening Create Memory modal
 *
 * At the end, opens CreateMemoryModal pre-filled with:
 *   - initialCollectionTitle: "A letter to [childName]"
 *   - initialItemTitle: "[milestone] — A letter to [childName]"
 *   - initialReleaseDate: calculated from milestone + DOB (YYYY-MM-DD)
 *   - initialReceiverName: childName
 *
 * Access: APPROVED users only (middleware handles redirect).
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CreateMemoryModal from "@/components/CreateMemoryModal";

const milestones = [
  {
    key: "18th",
    label: "18th Birthday",
    sub: "When they become an adult",
    icon: "🎂",
    calcDate: (dob: string) => {
      const d = new Date(dob); d.setFullYear(d.getFullYear() + 18);
      return d.toISOString().split("T")[0];
    },
  },
  {
    key: "21st",
    label: "21st Birthday",
    sub: "A coming of age moment",
    icon: "🎉",
    calcDate: (dob: string) => {
      const d = new Date(dob); d.setFullYear(d.getFullYear() + 21);
      return d.toISOString().split("T")[0];
    },
  },
  {
    key: "graduation",
    label: "Graduation Day",
    sub: "When they complete their studies",
    icon: "🎓",
    calcDate: (dob: string) => {
      const d = new Date(dob); d.setFullYear(d.getFullYear() + 23);
      return d.toISOString().split("T")[0];
    },
  },
  {
    key: "wedding",
    label: "Wedding Day",
    sub: "When they start their own family",
    icon: "💍",
    calcDate: (dob: string) => {
      const d = new Date(dob); d.setFullYear(d.getFullYear() + 28);
      return d.toISOString().split("T")[0];
    },
  },
  {
    key: "custom",
    label: "A specific date I choose",
    sub: "Set your own delivery date",
    icon: "📅",
    calcDate: () => "",
  },
];

const today = new Date().toISOString().split("T")[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

export default function MilestonePage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [childName, setChildName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [milestone, setMilestone] = useState<string | null>(null);
  const [releaseDate, setReleaseDate] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [showModal, setShowModal] = useState(false);

  const selectedMilestone = milestones.find((m) => m.key === milestone);
  const effectiveReleaseDate = milestone === "custom" ? customDate : releaseDate;
  const firstName = childName.trim().split(" ")[0] || "them";

  function selectMilestone(key: string) {
    setMilestone(key);
    if (key !== "custom" && childDob) {
      const m = milestones.find((m) => m.key === key)!;
      setReleaseDate(m.calcDate(childDob));
    } else {
      setReleaseDate("");
    }
  }

  const step1Valid = childName.trim().length > 0 && childDob.length > 0;
  const step2Valid = milestone !== null && (milestone !== "custom" ? releaseDate.length > 0 : customDate.length > 0);

  const formattedDate = effectiveReleaseDate
    ? new Date(effectiveReleaseDate).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })
    : "";

  // ── Shared styles ──────────────────────────────────────────────────────────

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#2C1810",
    marginBottom: 8, display: "block", textTransform: "uppercase",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "14px 16px", border: "1.5px solid rgba(184,150,90,0.3)",
    borderRadius: 10, fontSize: 15, fontFamily: "Lato, sans-serif", color: "#2C1810",
    background: "#fff", outline: "none", boxSizing: "border-box",
  };

  const primaryBtn = (disabled: boolean): React.CSSProperties => ({
    width: "100%", background: "#2C1810", color: "#FAF7F2", border: "none",
    borderRadius: 10, padding: "17px", fontSize: 15, fontWeight: 700,
    letterSpacing: "0.06em", cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.35 : 1, fontFamily: "Lato, sans-serif",
  });

  const backLink: React.CSSProperties = {
    background: "none", border: "none", color: "#B8965A", fontSize: 13,
    fontWeight: 600, cursor: "pointer", marginTop: 12, display: "block",
    textAlign: "center", width: "100%", fontFamily: "Lato, sans-serif",
  };

  // ── Dots ──────────────────────────────────────────────────────────────────

  function Dots() {
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 48 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            width: step === i ? 24 : 8, height: 8,
            borderRadius: step === i ? 4 : "50%",
            background: step === i ? "#B8965A" : "rgba(184,150,90,0.25)",
            transition: "all 300ms",
          }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ background: "#FAF7F2", minHeight: "100vh", fontFamily: "Lato, sans-serif" }}>
      {showModal && (
        <CreateMemoryModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); router.push("/dashboard"); }}
          initialCollectionTitle={`A letter to ${childName}`}
          initialItemTitle={`${selectedMilestone?.label} — A letter to ${firstName}`}
          initialReleaseDate={effectiveReleaseDate}
          initialReceiverName={childName}
        />
      )}

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "48px 24px" }}>
        <Dots />

        {/* ── Step 1 ── */}
        {step === 1 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", color: "#B8965A", textTransform: "uppercase", marginBottom: 16 }}>
              A LETTER TO MY CHILD — STEP 1 OF 3
            </div>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 36, fontWeight: 400, color: "#2C1810", lineHeight: 1.25, marginBottom: 12 }}>
              Who is this letter for?
            </div>
            <div style={{ fontSize: 15, color: "#888", lineHeight: 1.7, fontWeight: 300, marginBottom: 36 }}>
              Tell us about your child so we can personalise this memory.
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Child's full name</label>
              <input
                type="text"
                placeholder="e.g. Sarah Tan"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 32 }}>
              <label style={labelStyle}>Child's date of birth</label>
              <input
                type="date"
                max={today}
                value={childDob}
                onChange={(e) => setChildDob(e.target.value)}
                style={inputStyle}
              />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              style={primaryBtn(!step1Valid)}
            >
              Continue →
            </button>
            <button style={backLink} onClick={() => router.push("/dashboard")}>
              ← Back to dashboard
            </button>
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", color: "#B8965A", textTransform: "uppercase", marginBottom: 16 }}>
              A LETTER TO MY CHILD — STEP 2 OF 3
            </div>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 36, fontWeight: 400, color: "#2C1810", lineHeight: 1.25, marginBottom: 12 }}>
              When should {firstName} receive this?
            </div>
            <div style={{ fontSize: 15, color: "#888", lineHeight: 1.7, fontWeight: 300, marginBottom: 36 }}>
              Choose the milestone moment when your letter will be delivered.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
              {milestones.map((m) => {
                const isSelected = milestone === m.key;
                const isGraduation = m.key === "graduation" && isSelected;
                return (
                  <div
                    key={m.key}
                    onClick={() => selectMilestone(m.key)}
                    style={{
                      background: isGraduation ? "#F0F5F0" : isSelected ? "#FAF7F2" : "#fff",
                      border: `1.5px solid ${isGraduation ? "#7C9A7E" : isSelected ? "#B8965A" : "rgba(184,150,90,0.2)"}`,
                      borderRadius: 14,
                      padding: "20px 16px",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 200ms",
                      gridColumn: m.key === "custom" ? "span 2" : undefined,
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{m.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#2C1810", marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: "#aaa" }}>{m.sub}</div>
                  </div>
                );
              })}
            </div>

            {milestone === "custom" && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Choose delivery date</label>
                <input
                  type="date"
                  min={tomorrow}
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}

            {effectiveReleaseDate && (
              <div style={{ background: "#fff", border: "1px solid rgba(184,150,90,0.2)", borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#B8965A", flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: "#666" }}>
                  This letter will be delivered on{" "}
                  <strong style={{ color: "#B8965A" }}>{formattedDate}</strong>
                </span>
              </div>
            )}

            <button
              onClick={() => setStep(3)}
              disabled={!step2Valid}
              style={primaryBtn(!step2Valid)}
            >
              Continue →
            </button>
            <button style={backLink} onClick={() => setStep(1)}>
              ← Back
            </button>
          </>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", color: "#B8965A", textTransform: "uppercase", marginBottom: 16 }}>
              A LETTER TO MY CHILD — STEP 3 OF 3
            </div>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 36, fontWeight: 400, color: "#2C1810", lineHeight: 1.25, marginBottom: 12 }}>
              You are ready to write your letter.
            </div>
            <div style={{ fontSize: 15, color: "#888", lineHeight: 1.7, fontWeight: 300, marginBottom: 36 }}>
              Here is a summary. Click below to write your message to {firstName}.
            </div>

            <div style={{ background: "#fff", border: "1px solid rgba(184,150,90,0.2)", borderRadius: 16, padding: "24px 28px", marginBottom: 28 }}>
              {[
                { label: "FOR",         value: childName,                    gold: false },
                { label: "OCCASION",    value: selectedMilestone?.label ?? "", gold: false },
                { label: "DELIVERS ON", value: formattedDate,                 gold: true  },
              ].map((row, i, arr) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingBottom: i < arr.length - 1 ? 14 : 0,
                    marginBottom: i < arr.length - 1 ? 14 : 0,
                    borderBottom: i < arr.length - 1 ? "1px solid rgba(184,150,90,0.1)" : "none",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#aaa", letterSpacing: "0.08em" }}>{row.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: row.gold ? "#B8965A" : "#2C1810" }}>{row.value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowModal(true)}
              style={primaryBtn(false)}
            >
              Write my letter →
            </button>
            <button style={backLink} onClick={() => setStep(2)}>
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
