"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import TimeBridgeLogo from "./TimeBridgeLogo";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconHome() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
}

function IconSent() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>;
}

function IconReceived() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"/><path d="M2 6l10 7 10-7"/></svg>;
}

function IconGuardian() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
}

function IconProfile() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}

function IconAdmin() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}

function IconLogout() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type NavLink = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

// ── Navbar ────────────────────────────────────────────────────────────────────

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const role = (session?.user as any)?.role;
  const proofStage = (session?.user as any)?.proofOfLifeStage ?? "NORMAL";
  const isAdmin = role === "ADMIN";

  // Hide navbar on auth pages
  const hideOn = ["/login", "/register", "/complete-profile", "/pending-verification", "/claim", "/receiver", "/privacy", "/terms", "/data-deletion", "/contact"];
  if (hideOn.some((p) => pathname?.startsWith(p))) return null;
  if (status === "loading" || !session) return null;

  const links: NavLink[] = [
    { label: "Home",     href: "/dashboard",      icon: <IconHome /> },
    { label: "Sent",     href: "/memory-sent",     icon: <IconSent /> },
    { label: "Received", href: "/memory-received", icon: <IconReceived /> },
    { label: "Guardian", href: "/guardian",         icon: <IconGuardian /> },
    { label: "Profile",  href: "/profile",          icon: <IconProfile /> },
    ...(isAdmin ? [{ label: "Admin", href: "/admin", icon: <IconAdmin /> }] : []),
  ];

  function isActive(href: string) {
    return pathname?.startsWith(href) ?? false;
  }

  function navigate(href: string) {
    setDrawerOpen(false);
    router.push(href);
  }

  const proofDotClass =
    proofStage === "CRITICAL" ? "critical"
    : proofStage === "WARNING" ? "warning"
    : "";

  return (
    <>
      {/* ── Main navbar ── */}
      <nav className="tb-nav">

        {/* Logo */}
        <div className="tb-nav-logo" onClick={() => navigate("/dashboard")}>
          <TimeBridgeLogo size="xs" variant="light" showWordmark={false} animated={false} />
          <div>
            <div className="tb-nav-wordmark">TIME BRIDGE</div>
            <div className="tb-nav-tagline">My love stays, always</div>
          </div>
        </div>

        {/* Desktop links */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {links.map((link) => (
            <button
              key={link.href}
              onClick={() => navigate(link.href)}
              style={{
                background: isActive(link.href) ? "var(--gold-pale)" : "transparent",
                color: isActive(link.href) ? "var(--gold)" : "var(--earth-muted)",
                border: `1px solid ${isActive(link.href) ? "var(--gold-light)" : "transparent"}`,
                borderRadius: "var(--radius-sm)",
                padding: "7px 12px",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.5px",
                transition: "all var(--transition)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
                minHeight: 36,
              }}
              onMouseEnter={(e) => {
                if (!isActive(link.href)) {
                  e.currentTarget.style.background = "var(--parchment)";
                  e.currentTarget.style.color = "var(--earth)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(link.href)) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--earth-muted)";
                }
              }}
            >
              {link.icon}
              <span style={{ display: "none" }}
                    className="nav-label-desktop">{link.label}</span>
            </button>
          ))}

          {/* Proof of life dot */}
          <div style={{
            width: 8, height: 8,
            borderRadius: "50%",
            background: proofStage === "CRITICAL" ? "#DC2626"
              : proofStage === "WARNING" ? "var(--gold)"
              : "var(--sage)",
            marginLeft: 8,
            animation: "tb-pulse-dot 3s ease-in-out infinite",
            flexShrink: 0,
          }} title={`Proof-of-life: ${proofStage}`} />

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              background: "transparent",
              border: "1px solid var(--border-dark)",
              color: "var(--earth-muted)",
              borderRadius: "var(--radius-sm)",
              padding: "7px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginLeft: 4,
              fontSize: 12,
              fontFamily: "var(--font-body)",
              transition: "all var(--transition)",
              minHeight: 36,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--parchment)";
              e.currentTarget.style.color = "var(--earth)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--earth-muted)";
            }}
          >
            <IconLogout />
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="tb-nav-mobile-menu"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="tb-mobile-drawer-overlay open"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div className={`tb-mobile-drawer ${drawerOpen ? "open" : ""}`}>

        {/* Drawer header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--earth)", letterSpacing: 2 }}>
              TIME BRIDGE
            </div>
            <div style={{ fontSize: 10, color: "var(--earth-muted)", letterSpacing: 2, textTransform: "uppercase", marginTop: 2 }}>
              {session.user?.name ?? session.user?.email}
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            style={{
              width: 36, height: 36,
              borderRadius: "50%",
              background: "var(--parchment)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--earth-muted)",
            }}
          >
            ✕
          </button>
        </div>

        {/* Divider */}
        <div className="tb-divider-gold" style={{ margin: "0 0 20px" }} />

        {/* Proof of life status */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: proofStage === "CRITICAL" ? "#FEF2F2"
            : proofStage === "WARNING" ? "var(--gold-pale)"
            : "var(--sage-pale)",
          borderRadius: "var(--radius-md)",
          marginBottom: 20,
          border: `1px solid ${
            proofStage === "CRITICAL" ? "#FECACA"
            : proofStage === "WARNING" ? "var(--gold-light)"
            : "var(--sage-light)"
          }`,
        }}>
          <div className={`tb-proof-dot ${proofDotClass}`} />
          <span style={{ fontSize: 12, color: "var(--earth-mid)", fontWeight: 700 }}>
            {proofStage === "NORMAL" ? "All good — proof of life confirmed"
             : proofStage === "WARNING" ? "Reminder — please confirm you are here"
             : "Urgent — proof of life overdue"}
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {links.map((link) => (
            <button
              key={link.href}
              onClick={() => navigate(link.href)}
              style={{
                background: isActive(link.href) ? "var(--gold-pale)" : "transparent",
                color: isActive(link.href) ? "var(--gold)" : "var(--earth-mid)",
                border: `1px solid ${isActive(link.href) ? "var(--gold-light)" : "transparent"}`,
                borderRadius: "var(--radius-md)",
                padding: "13px 16px",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                textAlign: "left",
                width: "100%",
                minHeight: 48,
              }}
            >
              <span style={{ color: isActive(link.href) ? "var(--gold)" : "var(--earth-muted)" }}>
                {link.icon}
              </span>
              {link.label}
            </button>
          ))}
        </div>

        {/* Sign out */}
        <div style={{ marginTop: "auto", paddingTop: 24 }}>
          <div className="tb-divider-gold" style={{ margin: "0 0 16px" }} />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              width: "100%",
              background: "transparent",
              border: "1px solid var(--border-dark)",
              color: "var(--earth-muted)",
              borderRadius: "var(--radius-md)",
              padding: "13px 16px",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 10,
              minHeight: 48,
            }}
          >
            <IconLogout />
            Sign out
          </button>
        </div>
      </div>

      {/* ── Bottom tab bar (mobile only) ── */}
      <div className="tb-bottom-tabs">
        {links.slice(0, 4).map((link) => (
          <button
            key={link.href}
            className={`tb-bottom-tab ${isActive(link.href) ? "active" : ""}`}
            onClick={() => navigate(link.href)}
          >
            {link.icon}
            <span>{link.label}</span>
          </button>
        ))}
        <button
          className={`tb-bottom-tab ${drawerOpen ? "active" : ""}`}
          onClick={() => setDrawerOpen(true)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          <span>More</span>
        </button>
      </div>
    </>
  );
}
