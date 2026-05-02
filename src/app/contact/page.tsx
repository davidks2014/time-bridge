import PublicFooter from "@/components/PublicFooter";

export const metadata = {
  title: "Contact Us",
  description: "Get in touch with the Time Bridge team. We are here to help.",
};

export default function ContactPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--ivory)",
      paddingTop: 48,
      paddingBottom: 0,
    }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: 36,
              fontWeight: 300,
              color: "var(--earth)",
              marginBottom: 8,
              letterSpacing: "1px",
            }}>
              Time Bridge
            </h1>
          </a>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 400,
            color: "var(--gold)",
            marginBottom: 12,
          }}>
            Contact Us
          </h2>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: 15,
            color: "var(--earth-muted)",
            lineHeight: 1.7,
            maxWidth: 460,
            margin: "0 auto",
          }}>
            We are here to help. Reach out and we will respond within 3 business days.
          </p>
        </div>

        {/* Contact cards */}
        <div className="tb-card" style={{ padding: "36px 40px", marginBottom: 20 }}>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 500,
            color: "var(--gold)",
            marginBottom: 20,
          }}>
            General Enquiries
          </h3>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--gold-pale)",
              border: "1px solid var(--sand-dark)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-body)", lineHeight: 1.8 }}>
              <p style={{ margin: "0 0 4px" }}>For any questions about Time Bridge, your account, or the service:</p>
              <a href="mailto:davidks2014@gmail.com" style={{
                color: "var(--gold)",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 16,
              }}>
                davidks2014@gmail.com
              </a>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--earth-muted)" }}>
                Response within 3 business days
              </p>
            </div>
          </div>
        </div>

        <div className="tb-card" style={{ padding: "36px 40px", marginBottom: 20 }}>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 500,
            color: "var(--gold)",
            marginBottom: 20,
          }}>
            Data &amp; Privacy Enquiries
          </h3>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--gold-pale)",
              border: "1px solid var(--sand-dark)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-body)", lineHeight: 1.8 }}>
              <p style={{ margin: "0 0 4px" }}>
                For PDPA data access, correction, deletion requests, or privacy concerns, contact our Data Protection Officer:
              </p>
              <p style={{ margin: "0 0 4px" }}>
                <strong style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>Lee Kok Sang</strong>
              </p>
              <a href="mailto:davidks2014@gmail.com" style={{
                color: "var(--gold)",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 16,
              }}>
                davidks2014@gmail.com
              </a>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--earth-muted)" }}>
                Response within 3 business days
              </p>
            </div>
          </div>
        </div>

        <div className="tb-card" style={{ padding: "36px 40px", marginBottom: 20 }}>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 500,
            color: "var(--gold)",
            marginBottom: 20,
          }}>
            Account Deletion
          </h3>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--gold-pale)",
              border: "1px solid var(--sand-dark)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4h6v2"/>
              </svg>
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-body)", lineHeight: 1.8 }}>
              <p style={{ margin: "0 0 8px" }}>
                You can delete your account directly in the app under Profile → Privacy &amp; Data,
                or visit our{" "}
                <a href="/data-deletion" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 700 }}>
                  Data Deletion page
                </a>{" "}
                for full instructions.
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--earth-muted)" }}>
                Deletion requests sent by email are processed within 30 days
              </p>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div style={{
          padding: "16px 20px",
          background: "var(--cream)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: "var(--earth-muted)",
          lineHeight: 1.7,
          textAlign: "center",
          marginBottom: 8,
        }}>
          Time Bridge is a personal project based in Singapore. We take every message seriously
          and will respond as promptly as possible.
        </div>

        {/* Back link */}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <a href="/login" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--earth-muted)", textDecoration: "none" }}>
            ← Back to Time Bridge
          </a>
        </div>

        <PublicFooter />
      </div>
    </div>
  );
}
