/**
 * Page: /onboarding
 *
 * Purpose: First-time user onboarding flow.
 * Shown to new users who have not yet completed their profile.
 * Guides them through segment selection and a 3-slide carousel
 * explaining how Time Bridge works for their specific need.
 * At the end, redirects to /complete-profile to submit verification.
 *
 * Access: Only accessible to users with profileComplete = false.
 * Middleware redirects approved users away to /dashboard.
 */
"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  useSession(); // ensures session is available; middleware handles all redirects
  const router = useRouter();

  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [wizardSelection, setWizardSelection] = useState<"planner" | "parent" | "keeper" | null>(null);
  const [carouselStep, setCarouselStep] = useState<0 | 1 | 2>(0);

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px 64px" }}>

        {/* ── Step 1: Card selection ── */}
        {wizardStep === 1 && (
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
                onClick={() => { if (wizardSelection) { setWizardStep(2); setCarouselStep(0); } }}
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
        )}

        {/* ── Step 2: Carousel ── */}
        {wizardStep === 2 && (
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
                        onClick={() => router.push("/complete-profile")}
                        style={{ background: "#B8965A", color: "#FAF7F2", border: "none", borderRadius: 10, padding: "14px 40px", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" }}
                      >
                        Complete my profile →
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}
