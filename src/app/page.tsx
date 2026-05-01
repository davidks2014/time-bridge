"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import TimeBridgeLogo from "@/components/TimeBridgeLogo";

export default function LandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // If already logged in and approved, go to dashboard
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") return null;

  return (
    <div style={{ background: "#FAF7F2", minHeight: "100vh", fontFamily: "Lato, sans-serif", color: "#2C1810" }}>

      {/* ── NAV ── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 40px", borderBottom: "1px solid rgba(184,150,90,0.15)",
        background: "#FAF7F2", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 20, fontWeight: 600, color: "#2C1810", letterSpacing: "0.04em" }}>
          Time<span style={{ color: "#B8965A" }}>Bridge</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <button onClick={() => router.push("/login")} style={{ background: "none", border: "none", fontSize: 13, color: "#9A8878", fontWeight: 700, letterSpacing: "0.04em", cursor: "pointer", fontFamily: "Lato, sans-serif" }}>
            Sign in
          </button>
          <button onClick={() => router.push("/register")} style={{ background: "#2C1810", color: "#FAF7F2", border: "none", borderRadius: 10, padding: "10px 22px", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer", fontFamily: "Lato, sans-serif" }}>
            GET STARTED FREE
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: "80px 40px 72px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "rgba(184,150,90,0.12)", border: "1px solid rgba(184,150,90,0.3)", borderRadius: 20, padding: "6px 16px", fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: "#B8965A", marginBottom: 28 }}>
          SINGAPORE&apos;S LOVE DELIVERY PLATFORM
        </div>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(40px, 6vw, 62px)", fontWeight: 300, lineHeight: 1.15, color: "#2C1810", marginBottom: 20, maxWidth: 700, marginLeft: "auto", marginRight: "auto" }}>
          Your words, delivered<br />
          <em style={{ fontStyle: "italic", color: "#B8965A" }}>when they need it most.</em>
        </h1>
        <p style={{ fontSize: 17, color: "#9A8878", lineHeight: 1.8, maxWidth: 480, margin: "0 auto 40px", fontWeight: 300 }}>
          Write letters to your children. Document everything for your family. Schedule memories for the people you love — now, or years from today.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <button onClick={() => router.push("/register")} style={{ background: "#2C1810", color: "#FAF7F2", border: "none", borderRadius: 12, padding: "16px 36px", fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer", fontFamily: "Lato, sans-serif" }}>
            Begin your legacy →
          </button>
          <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} style={{ background: "transparent", color: "#B8965A", border: "1.5px solid rgba(184,150,90,0.4)", borderRadius: 12, padding: "15px 32px", fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer", fontFamily: "Lato, sans-serif" }}>
            See how it works
          </button>
        </div>
        <p style={{ marginTop: 20, fontSize: 12, color: "rgba(184,150,90,0.6)", letterSpacing: "0.04em" }}>
          Free to start · No credit card required · Singapore-based
        </p>
      </section>

      {/* ── TRUST BAR ── */}
      <div style={{ background: "#2C1810", padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
        {["PDPA COMPLIANT", "STORED IN SINGAPORE", "END-TO-END SECURE", "FREE TO START"].map((item) => (
          <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#B8965A", flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(250,247,242,0.7)" }}>{item}</span>
          </div>
        ))}
      </div>

      {/* ── WHO IT'S FOR ── */}
      <section style={{ padding: "72px 40px" }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.2em", color: "#B8965A", textAlign: "center", marginBottom: 12 }}>WHO IT&apos;S FOR</div>
        <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, color: "#2C1810", textAlign: "center", marginBottom: 48, lineHeight: 1.25 }}>
          Built for people who love deeply<br />and plan ahead.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, maxWidth: 800, margin: "0 auto" }}>
          {/* Planner */}
          <div style={{ background: "#fff", border: "1px solid rgba(184,150,90,0.18)", borderTop: "3px solid #B8965A", borderRadius: 20, padding: "36px 32px" }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: "#B8965A", marginBottom: 16 }}>01</div>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(184,150,90,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 26, fontWeight: 600, color: "#2C1810", marginBottom: 12, lineHeight: 1.2 }}>The Planner</div>
            <div style={{ fontSize: 14, color: "#9A8878", lineHeight: 1.85, marginBottom: 20 }}>
              You have insurance, CPF nominations, and a will — but if something happens suddenly, will your family know where to find everything you prepared?
            </div>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 15, fontStyle: "italic", color: "#B8965A", lineHeight: 1.6, paddingTop: 16, borderTop: "1px solid rgba(184,150,90,0.15)" }}>
              &ldquo;I thought of everything, so you would be okay.&rdquo;
            </div>
          </div>
          {/* Loving Parent */}
          <div style={{ background: "#fff", border: "1px solid rgba(124,154,126,0.2)", borderTop: "3px solid #7C9A7E", borderRadius: 20, padding: "36px 32px" }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: "#7C9A7E", marginBottom: 16 }}>02</div>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(124,154,126,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C9A7E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </div>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 26, fontWeight: 600, color: "#2C1810", marginBottom: 12, lineHeight: 1.2 }}>The Loving Parent</div>
            <div style={{ fontSize: 14, color: "#9A8878", lineHeight: 1.85, marginBottom: 20 }}>
              You love your child more than words can say — but saying &ldquo;I love you&rdquo; out loud is hard. Write a letter for their 18th birthday. Let them read it when they&apos;re ready.
            </div>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 15, fontStyle: "italic", color: "#7C9A7E", lineHeight: 1.6, paddingTop: 16, borderTop: "1px solid rgba(124,154,126,0.15)" }}>
              &ldquo;I have always loved you — here is everything I wanted to say.&rdquo;
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ background: "#2C1810", padding: "72px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.2em", color: "rgba(184,150,90,0.7)", marginBottom: 12 }}>HOW IT WORKS</div>
        <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, color: "#FAF7F2", marginBottom: 56, lineHeight: 1.25 }}>
          Simple. Secure. Delivered<br />at exactly the right moment.
        </h2>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 0, maxWidth: 700, margin: "0 auto", flexWrap: "wrap" }}>
          {[
            { num: "1", title: "YOU CREATE", sub: "Write your message, add photos or videos" },
            { num: "2", title: "WE HOLD IT", sub: "Safe and secure — only you can see it" },
            { num: "3", title: "THEY RECEIVE IT", sub: "On the date you choose, or when needed most" },
          ].map((step, i) => (
            <div key={step.num} style={{ display: "flex", alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, minWidth: 160 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(184,150,90,0.15)", border: "1px solid rgba(184,150,90,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Cormorant Garamond, serif", fontSize: 24, color: "#B8965A" }}>
                  {step.num}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#FAF7F2", letterSpacing: "0.06em" }}>{step.title}</div>
                <div style={{ fontSize: 12, color: "rgba(250,247,242,0.45)", lineHeight: 1.6, maxWidth: 120, textAlign: "center" }}>{step.sub}</div>
              </div>
              {i < 2 && <div style={{ color: "rgba(184,150,90,0.35)", fontSize: 22, marginTop: 20, padding: "0 8px", flexShrink: 0 }}>→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── 3 PILLARS ── */}
      <section style={{ padding: "72px 40px" }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.2em", color: "#B8965A", textAlign: "center", marginBottom: 12 }}>WHAT YOU CAN DO</div>
        <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, color: "#2C1810", textAlign: "center", marginBottom: 48, lineHeight: 1.25 }}>
          Three ways to deliver your love.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, maxWidth: 860, margin: "0 auto" }}>
          {[
            {
              title: "Protect my family",
              body: "Document your insurance, CPF, and assets. Leave instructions and final words — delivered to your family after you pass.",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
            },
            {
              title: "A letter to my child",
              body: "Write now. Deliver on their 18th birthday, graduation day, or wedding. Your words, at exactly the right moment.",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
            },
            {
              title: "Schedule a memory",
              body: "Write a message, attach photos or videos, and choose when someone special receives it — now or years from today.",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
            },
          ].map((pill) => (
            <div key={pill.title} style={{ background: "#fff", border: "1px solid rgba(184,150,90,0.15)", borderRadius: 18, padding: "32px 24px", textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(184,150,90,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                {pill.icon}
              </div>
              <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, fontWeight: 600, color: "#2C1810", marginBottom: 10 }}>{pill.title}</div>
              <div style={{ fontSize: 13, color: "#9A8878", lineHeight: 1.8 }}>{pill.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ background: "#F5F0E8", padding: "72px 40px" }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.2em", color: "#B8965A", textAlign: "center", marginBottom: 12 }}>PRICING</div>
        <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, color: "#2C1810", textAlign: "center", marginBottom: 48, lineHeight: 1.25 }}>
          Start free. Grow when you&apos;re ready.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, maxWidth: 760, margin: "0 auto" }}>
          {[
            { plan: "FREE", amount: "$0", period: "forever", storage: "500 MB storage", body: "Text messages · Photos · Videos · Unlimited memories", featured: false },
            { plan: "PLUS", amount: "$3.90", period: "per month", storage: "5 GB storage", body: "Everything in Free · More photos & videos", featured: true },
            { plan: "PREMIUM", amount: "$8.90", period: "per month", storage: "20 GB storage", body: "Everything in Plus · Full video library", featured: false },
          ].map((p) => (
            <div key={p.plan} style={{ background: p.featured ? "#2C1810" : "#fff", border: `1px solid ${p.featured ? "#2C1810" : "rgba(184,150,90,0.18)"}`, borderRadius: 18, padding: "28px 24px", textAlign: "center" }}>
              {p.featured && <div style={{ display: "inline-block", background: "rgba(184,150,90,0.15)", color: "#B8965A", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", padding: "4px 12px", borderRadius: 20, marginBottom: 12 }}>MOST POPULAR</div>}
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: p.featured ? "rgba(184,150,90,0.7)" : "#B8965A", marginBottom: 16 }}>{p.plan}</div>
              <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 42, fontWeight: 400, color: p.featured ? "#FAF7F2" : "#2C1810", lineHeight: 1 }}>{p.amount}</div>
              <div style={{ fontSize: 12, color: p.featured ? "rgba(250,247,242,0.5)" : "#9A8878", marginBottom: 16, marginTop: 4 }}>{p.period}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#B8965A", marginBottom: 16 }}>{p.storage}</div>
              <div style={{ fontSize: 12, color: p.featured ? "rgba(250,247,242,0.45)" : "#9A8878", lineHeight: 1.7 }}>{p.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: "80px 40px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 300, color: "#2C1810", lineHeight: 1.2, marginBottom: 16 }}>
          Your love is too important<br />to leave to <em style={{ fontStyle: "italic", color: "#B8965A" }}>chance.</em>
        </h2>
        <p style={{ fontSize: 16, color: "#9A8878", marginBottom: 36 }}>Start for free today. Write your first memory in minutes.</p>
        <button onClick={() => router.push("/register")} style={{ background: "#2C1810", color: "#FAF7F2", border: "none", borderRadius: 12, padding: "18px 48px", fontSize: 15, fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer", fontFamily: "Lato, sans-serif" }}>
          Begin your legacy →
        </button>
        <p style={{ marginTop: 16, fontSize: 12, color: "rgba(184,150,90,0.5)", letterSpacing: "0.04em" }}>Free forever · No credit card · Singapore-based</p>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#2C1810", padding: "28px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 16, color: "rgba(250,247,242,0.6)" }}>Time Bridge · timebridge.sg</div>
        <div style={{ display: "flex", gap: 24 }}>
          {[["Privacy", "/privacy"], ["Terms", "/terms"], ["Contact", "/contact"], ["Claim a memory", "/claim"]].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: 12, color: "rgba(250,247,242,0.4)", fontWeight: 700, letterSpacing: "0.06em", textDecoration: "none" }}>{label}</a>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "rgba(250,247,242,0.25)" }}>© 2026 Time Bridge Pte. Ltd.</div>
      </footer>

    </div>
  );
}
