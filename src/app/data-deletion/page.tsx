import type { Metadata } from "next";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Account & Data Deletion — Time Bridge",
  description: "How to delete your Time Bridge account and request removal of your personal data.",
};

export default function DataDeletionPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--ivory)",
      paddingTop: 48,
      paddingBottom: 0,
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>

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
            Account &amp; Data Deletion
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--earth-muted)" }}>
            We respect your right to delete your data at any time
          </p>
        </div>

        {/* What gets deleted */}
        <div className="tb-card" style={{ padding: "36px 40px", marginBottom: 24 }}>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 500,
            color: "var(--gold)",
            marginBottom: 16,
          }}>
            What Is Deleted
          </h3>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-body)", lineHeight: 1.8, marginBottom: 16 }}>
            When you delete your account, the following data is permanently removed:
          </p>
          <ul style={{ paddingLeft: 20, fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-body)", lineHeight: 1.8 }}>
            <li style={{ marginBottom: 8 }}>Your name, email address, phone number, and residential address</li>
            <li style={{ marginBottom: 8 }}>Your NRIC/FIN and identity documents</li>
            <li style={{ marginBottom: 8 }}>All legacy messages, letters, and memory collections you have created</li>
            <li style={{ marginBottom: 8 }}>All photos, videos, and attachments you have uploaded</li>
            <li style={{ marginBottom: 8 }}>Your receiver list and their contact information</li>
            <li style={{ marginBottom: 8 }}>Your guardian designations</li>
            <li style={{ marginBottom: 8 }}>Your proof-of-life settings and history</li>
            <li style={{ marginBottom: 8 }}>All account settings and preferences</li>
          </ul>
        </div>

        {/* What cannot be deleted */}
        <div style={{
          padding: "20px 24px",
          background: "var(--sage-pale)",
          border: "1px solid var(--sage-light)",
          borderRadius: "var(--radius-md)",
          marginBottom: 24,
          fontFamily: "var(--font-body)",
          fontSize: 14,
          color: "#2A4A2A",
          lineHeight: 1.7,
        }}>
          <strong style={{ fontFamily: "var(--font-display)", fontSize: 16, display: "block", marginBottom: 8 }}>
            Please note
          </strong>
          Memories that have already been delivered to receivers cannot be recalled or deleted.
          Once a message reaches its recipient, it belongs to them. We are also required to retain
          security audit logs for 2 years in accordance with our legal obligations.
        </div>

        {/* How to delete — In-app */}
        <div className="tb-card" style={{ padding: "36px 40px", marginBottom: 24 }}>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 500,
            color: "var(--gold)",
            marginBottom: 16,
          }}>
            How to Delete Your Account
          </h3>

          <div style={{ marginBottom: 28 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--gold)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}>
                1
              </div>
              <h4 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--earth)", margin: 0 }}>
                Delete in the app (recommended)
              </h4>
            </div>
            <div style={{ paddingLeft: 44, fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-body)", lineHeight: 1.8 }}>
              <p style={{ margin: "0 0 8px" }}>Sign in to Time Bridge, then go to:</p>
              <div style={{
                background: "var(--cream)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 16px",
                fontFamily: "var(--font-body)",
                fontSize: 14,
                color: "var(--earth)",
                marginBottom: 8,
              }}>
                Profile → Privacy &amp; Data tab → Delete Account
              </div>
              <p style={{ margin: 0, color: "var(--earth-muted)", fontSize: 13 }}>
                You will be asked to type <strong>DELETE</strong> to confirm. Deletion is immediate.
              </p>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--earth-muted)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}>
                2
              </div>
              <h4 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--earth)", margin: 0 }}>
                Request by email
              </h4>
            </div>
            <div style={{ paddingLeft: 44, fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-body)", lineHeight: 1.8 }}>
              <p style={{ margin: "0 0 8px" }}>
                If you are unable to sign in, email us at:
              </p>
              <div style={{
                background: "var(--gold-pale)",
                border: "1px solid var(--sand-dark)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 16px",
                fontFamily: "var(--font-body)",
                fontSize: 14,
                marginBottom: 8,
              }}>
                <strong>To:</strong>{" "}
                <a href="mailto:davidks2014@gmail.com" style={{ color: "var(--gold)", textDecoration: "none" }}>
                  davidks2014@gmail.com
                </a>
                <br />
                <strong>Subject:</strong> Delete My Account
                <br />
                <strong>Include:</strong> Your registered email address
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="tb-card" style={{ padding: "32px 40px", marginBottom: 24 }}>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 500,
            color: "var(--gold)",
            marginBottom: 16,
          }}>
            Deletion Timeline
          </h3>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-body)", lineHeight: 1.8 }}>
            <p style={{ marginBottom: 12 }}>
              <strong>In-app deletion:</strong> Your account and data are permanently deleted immediately.
            </p>
            <p style={{ marginBottom: 12 }}>
              <strong>Email request:</strong> We will process your request and confirm deletion within 30 days of receiving your email, in accordance with PDPA requirements.
            </p>
            <p style={{ marginBottom: 0 }}>
              You will receive a confirmation email once your data has been deleted.
            </p>
          </div>
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
