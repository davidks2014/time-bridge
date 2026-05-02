"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function LandingPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") return null;

  return (
    <div style={{ background: "#FAF7F2", minHeight: "100vh", fontFamily: "Lato, sans-serif", color: "#2C1810" }}>

      {/* NAV */}
      <nav className="tb-landing-nav">
        <div className="tb-landing-nav-logo">
          Time<span style={{ color: "#B8965A" }}>Bridge</span>
        </div>
        <div className="tb-landing-nav-actions">
          <button className="tb-landing-nav-signin" onClick={() => router.push("/login")}>Sign in</button>
          <button className="tb-landing-nav-cta" onClick={() => router.push("/register")}>GET STARTED FREE</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="tb-landing-hero">
        <div style={{ display: "inline-block", background: "rgba(184,150,90,0.12)", border: "1px solid rgba(184,150,90,0.3)", borderRadius: 20, padding: "5px 14px", fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", color: "#B8965A", marginBottom: 24 }}>
          SINGAPORE&apos;S LOVE DELIVERY PLATFORM
        </div>
        <h1>
          Your words, delivered<br />
          <em style={{ fontStyle: "italic", color: "#B8965A" }}>when they need it most.</em>
        </h1>
        <p className="tb-landing-hero-sub">
          Write letters to your children. Document everything for your family. Schedule memories for the people you love — now, or years from today.
        </p>
        <div className="tb-landing-hero-ctas">
          <button className="tb-landing-hero-cta-primary" onClick={() => router.push("/register")}>
            Begin your legacy →
          </button>
          <button className="tb-landing-hero-cta-secondary" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
            See how it works
          </button>
        </div>
        <p style={{ fontSize: 11, color: "rgba(184,150,90,0.6)", letterSpacing: "0.04em" }}>
          Free to start · No credit card required · Singapore-based
        </p>
      </section>

      {/* TRUST BAR */}
      <div className="tb-landing-trust">
        {["PDPA COMPLIANT", "STORED IN SINGAPORE", "END-TO-END SECURE", "FREE TO START"].map((item) => (
          <div key={item} className="tb-landing-trust-item">
            <div className="tb-landing-trust-dot" />
            <span className="tb-landing-trust-text">{item}</span>
          </div>
        ))}
      </div>

      {/* WHO IT'S FOR */}
      <section className="tb-landing-section">
        <div className="tb-landing-section-label">WHO IT&apos;S FOR</div>
        <h2 className="tb-landing-section-title">
          Built for people who love deeply<br />and plan ahead.
        </h2>
        <div className="tb-landing-seg-grid">
          <div className="tb-landing-seg-card" style={{ border: "1px solid rgba(184,150,90,0.18)", borderTop: "3px solid #B8965A" }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: "#B8965A", marginBottom: 14 }}>01</div>
            <div className="tb-landing-icon-wrap" style={{ background: "rgba(184,150,90,0.1)", marginBottom: 16 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 600, color: "#2C1810", marginBottom: 10, lineHeight: 1.2 }}>The Planner</div>
            <div style={{ fontSize: 14, color: "#9A8878", lineHeight: 1.8, marginBottom: 16 }}>
              You have insurance, CPF nominations, and a will — but if something happens suddenly, will your family know where to find everything you prepared?
            </div>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 14, fontStyle: "italic", color: "#B8965A", lineHeight: 1.6, paddingTop: 14, borderTop: "1px solid rgba(184,150,90,0.15)" }}>
              &ldquo;I thought of everything, so you would be okay.&rdquo;
            </div>
          </div>
          <div className="tb-landing-seg-card" style={{ border: "1px solid rgba(124,154,126,0.2)", borderTop: "3px solid #7C9A7E" }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: "#7C9A7E", marginBottom: 14 }}>02</div>
            <div className="tb-landing-icon-wrap" style={{ background: "rgba(124,154,126,0.12)", marginBottom: 16 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#7C9A7E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </div>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 600, color: "#2C1810", marginBottom: 10, lineHeight: 1.2 }}>The Loving Parent</div>
            <div style={{ fontSize: 14, color: "#9A8878", lineHeight: 1.8, marginBottom: 16 }}>
              You love your child more than words can say — but saying &ldquo;I love you&rdquo; out loud is hard. Write a letter for their 18th birthday. Let them read it when they&apos;re ready.
            </div>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 14, fontStyle: "italic", color: "#7C9A7E", lineHeight: 1.6, paddingTop: 14, borderTop: "1px solid rgba(124,154,126,0.15)" }}>
              &ldquo;I have always loved you — here is everything I wanted to say.&rdquo;
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="tb-landing-hiw">
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.2em", color: "rgba(184,150,90,0.7)", marginBottom: 10 }}>HOW IT WORKS</div>
        <h2 className="tb-landing-hiw-title">
          Simple. Secure. Delivered<br />at exactly the right moment.
        </h2>
        <div className="tb-landing-hiw-steps">
          {[
            { num: "1", title: "YOU CREATE", sub: "Write your message, add photos or videos" },
            { num: "2", title: "WE HOLD IT", sub: "Safe and secure — only you can see it" },
            { num: "3", title: "THEY RECEIVE IT", sub: "On the date you choose, or when needed most" },
          ].map((step, i) => (
            <>
              <div key={step.num} className="tb-landing-hiw-step">
                <div className="tb-landing-hiw-circle">{step.num}</div>
                <div>
                  <div className="tb-landing-hiw-step-title">{step.title}</div>
                  <div className="tb-landing-hiw-step-sub">{step.sub}</div>
                </div>
              </div>
              {i < 2 && <div key={`a${i}`} className="tb-landing-hiw-arrow">→</div>}
            </>
          ))}
        </div>
      </section>

      {/* 3 PILLARS */}
      <section className="tb-landing-section">
        <div className="tb-landing-section-label">WHAT YOU CAN DO</div>
        <h2 className="tb-landing-section-title">Three ways to deliver your love.</h2>
        <div className="tb-landing-pill-grid">
          {[
            { title: "Protect my family", body: "Document your insurance, CPF, and assets. Leave instructions and final words — delivered to your family after you pass.", icon: <svg viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
            { title: "A letter to my child", body: "Write now. Deliver on their 18th birthday, graduation day, or wedding. Your words, at exactly the right moment.", icon: <svg viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
            { title: "Schedule a memory", body: "Write a message, attach photos or videos, and choose when someone special receives it — now or years from today.", icon: <svg viewBox="0 0 24 24" fill="none" stroke="#B8965A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
          ].map((pill) => (
            <div key={pill.title} className="tb-landing-pill-card">
              <div className="tb-landing-icon-wrap" style={{ background: "rgba(184,150,90,0.08)", margin: "0 auto 14px" }}>
                {pill.icon}
              </div>
              <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(18px, 3vw, 22px)", fontWeight: 600, color: "#2C1810", marginBottom: 8 }}>{pill.title}</div>
              <div style={{ fontSize: 13, color: "#9A8878", lineHeight: 1.75 }}>{pill.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="tb-landing-section" style={{ background: "#F5F0E8" }}>
        <div className="tb-landing-section-label">PRICING</div>
        <h2 className="tb-landing-section-title">Start free. Grow when you&apos;re ready.</h2>
        <div className="tb-landing-price-grid">
          {[
            { plan: "FREE", amount: "$0", period: "forever", storage: "500 MB storage", body: "Text messages · Photos · Videos · Unlimited memories", featured: false },
            { plan: "PLUS", amount: "$3.90", period: "per month", storage: "5 GB storage", body: "Everything in Free · More photos & videos", featured: true },
            { plan: "PREMIUM", amount: "$8.90", period: "per month", storage: "20 GB storage", body: "Everything in Plus · Full video library", featured: false },
          ].map((p) => (
            <div key={p.plan} className="tb-landing-price-card" style={{ background: p.featured ? "#2C1810" : "#fff", border: `1px solid ${p.featured ? "#2C1810" : "rgba(184,150,90,0.18)"}` }}>
              {p.featured && <div style={{ display: "inline-block", background: "rgba(184,150,90,0.15)", color: "#B8965A", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", padding: "3px 10px", borderRadius: 20, marginBottom: 10 }}>MOST POPULAR</div>}
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", color: p.featured ? "rgba(184,150,90,0.7)" : "#B8965A", marginBottom: 12 }}>{p.plan}</div>
              <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 38, fontWeight: 400, color: p.featured ? "#FAF7F2" : "#2C1810", lineHeight: 1 }}>{p.amount}</div>
              <div style={{ fontSize: 12, color: p.featured ? "rgba(250,247,242,0.5)" : "#9A8878", marginBottom: 12, marginTop: 4 }}>{p.period}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#B8965A", marginBottom: 10 }}>{p.storage}</div>
              <div style={{ fontSize: 12, color: p.featured ? "rgba(250,247,242,0.45)" : "#9A8878", lineHeight: 1.7 }}>{p.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="tb-landing-section" style={{ textAlign: "center" }}>
        <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(26px, 6vw, 52px)", fontWeight: 300, color: "#2C1810", lineHeight: 1.2, marginBottom: 14 }}>
          Your love is too important<br />to leave to <em style={{ fontStyle: "italic", color: "#B8965A" }}>chance.</em>
        </h2>
        <p style={{ fontSize: 15, color: "#9A8878", marginBottom: 28 }}>Start for free today. Write your first memory in minutes.</p>
        <button onClick={() => router.push("/register")} className="tb-landing-hero-cta-primary" style={{ maxWidth: 280 }}>
          Begin your legacy →
        </button>
        <p style={{ marginTop: 14, fontSize: 11, color: "rgba(184,150,90,0.5)", letterSpacing: "0.04em" }}>Free forever · No credit card · Singapore-based</p>
      </section>

      {/* FOOTER */}
      <footer className="tb-landing-footer">
        <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 15, color: "rgba(250,247,242,0.6)" }}>Time Bridge · timebridge.sg</div>
        <div className="tb-landing-footer-links">
          {[["Privacy", "/privacy"], ["Terms", "/terms"], ["Contact", "/contact"], ["Claim a memory", "/claim"]].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: 12, color: "rgba(250,247,242,0.4)", fontWeight: 700, letterSpacing: "0.06em", textDecoration: "none" }}>{label}</a>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "rgba(250,247,242,0.25)" }}>© 2026 Time Bridge Pte. Ltd.</div>
      </footer>

    </div>
  );
}
