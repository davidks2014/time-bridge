"use client";

const linkStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--earth-muted)",
  textDecoration: "none",
  fontFamily: "var(--font-body)",
  transition: "color 0.2s",
};

export default function PublicFooter() {
  return (
    <footer style={{
      textAlign: "center",
      padding: "28px 20px 48px",
      borderTop: "1px solid var(--border)",
      marginTop: 48,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 10,
      }}>
        <a href="/privacy" style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = "var(--gold)")} onMouseLeave={e => (e.currentTarget.style.color = "var(--earth-muted)")}>
          Privacy Policy
        </a>
        <span style={{ color: "var(--border-dark)", fontSize: 12 }}>·</span>
        <a href="/terms" style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = "var(--gold)")} onMouseLeave={e => (e.currentTarget.style.color = "var(--earth-muted)")}>
          Terms of Service
        </a>
        <span style={{ color: "var(--border-dark)", fontSize: 12 }}>·</span>
        <a href="/data-deletion" style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = "var(--gold)")} onMouseLeave={e => (e.currentTarget.style.color = "var(--earth-muted)")}>
          Data Deletion
        </a>
        <span style={{ color: "var(--border-dark)", fontSize: 12 }}>·</span>
        <a href="/contact" style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = "var(--gold)")} onMouseLeave={e => (e.currentTarget.style.color = "var(--earth-muted)")}>
          Contact
        </a>
      </div>
      <p style={{ fontSize: 11, color: "var(--earth-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.5px" }}>
        © {new Date().getFullYear()} Time Bridge · Singapore · PDPA Compliant
      </p>
    </footer>
  );
}
