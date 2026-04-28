import type { Metadata } from "next";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — Time Bridge",
  description: "How Time Bridge collects, uses, and protects your personal data. PDPA compliant.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: 22,
        fontWeight: 500,
        color: "var(--gold)",
        marginBottom: 14,
        paddingBottom: 8,
        borderBottom: "1px solid var(--border)",
      }}>
        {title}
      </h2>
      <div style={{
        fontFamily: "var(--font-body)",
        fontSize: 15,
        color: "var(--text-body)",
        lineHeight: 1.8,
      }}>
        {children}
      </div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ marginBottom: 12 }}>{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ marginBottom: 8, paddingLeft: 8 }}>{children}</li>
  );
}

export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--ivory)",
      paddingTop: 48,
      paddingBottom: 0,
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>

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
            Privacy Policy
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--earth-muted)" }}>
            Last updated: April 2026
          </p>
        </div>

        {/* Card */}
        <div className="tb-card" style={{ padding: "40px 40px 32px" }}>

          <Section title="About This Policy">
            <P>
              Time Bridge (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is a personal project operated by Lee Kok Sang
              (davidks2014@gmail.com). We are committed to protecting your personal data in
              accordance with Singapore&rsquo;s Personal Data Protection Act 2012 (PDPA).
            </P>
            <P>
              This Privacy Policy explains what personal data we collect, why we collect it,
              how we use and store it, and your rights as a user.
            </P>
          </Section>

          <Section title="Data We Collect">
            <P>We collect the following personal data when you use Time Bridge:</P>
            <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
              <Li><strong>Identity:</strong> Full name, NRIC/FIN number, date of birth</Li>
              <Li><strong>Contact:</strong> Email address, phone number, residential address</Li>
              <Li><strong>Identity documents:</strong> Photos of NRIC or passport (front and back) for identity verification</Li>
              <Li><strong>Legacy messages:</strong> Written letters, voice recordings, photos, videos, and other content you create and store on Time Bridge</Li>
              <Li><strong>Receiver information:</strong> Names, contact details, and addresses of people you designate to receive your messages</Li>
              <Li><strong>Guardian information:</strong> Names and contact details of your appointed trusted contacts</Li>
              <Li><strong>Account activity:</strong> Login times, proof-of-life responses, device information</Li>
              <Li><strong>Technical data:</strong> IP address, browser type (for security logging only)</Li>
            </ul>
          </Section>

          <Section title="Why We Collect Your Data">
            <P>Your personal data is used for the following purposes:</P>
            <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
              <Li><strong>Account creation and management:</strong> To create and maintain your Time Bridge account</Li>
              <Li><strong>Identity verification:</strong> To verify your identity in accordance with our security requirements</Li>
              <Li><strong>Legacy message delivery:</strong> To deliver your messages to your chosen receivers at the appropriate time</Li>
              <Li><strong>Proof-of-life monitoring:</strong> To check in with you regularly and detect extended periods of inactivity</Li>
              <Li><strong>Guardian notifications:</strong> To notify your appointed guardians when a delivery trigger is activated</Li>
              <Li><strong>Legal compliance:</strong> To comply with Singapore law including PDPA requirements</Li>
              <Li><strong>Service improvement:</strong> To maintain, improve, and secure the Time Bridge platform</Li>
            </ul>
            <P>
              We do not use your personal data for advertising, profiling, or any purpose not
              listed above.
            </P>
          </Section>

          <Section title="How We Store Your Data">
            <P>
              Your data is stored exclusively in Singapore and the Southeast Asia region:
            </P>
            <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
              <Li><strong>Database:</strong> Neon PostgreSQL (ap-southeast-1 region, Singapore)</Li>
              <Li><strong>Media files</strong> (photos, videos, documents): Cloudinary (Southeast Asia delivery nodes)</Li>
              <Li><strong>Application hosting:</strong> Vercel (with Asia Pacific edge nodes)</Li>
            </ul>
            <P>
              All data in transit is encrypted using TLS 1.2 or higher. Media files stored on
              Cloudinary are access-controlled and not publicly accessible without authentication.
            </P>
          </Section>

          <Section title="How Long We Keep Your Data">
            <P>We retain your personal data as follows:</P>
            <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
              <Li>Account data and messages are retained for as long as your account is active</Li>
              <Li>If you delete your account, all personal data is permanently deleted within 30 days</Li>
              <Li>If an account is inactive for 7 years with no proof-of-life response, we may initiate delivery and archive your data</Li>
              <Li>Messages that have already been delivered to receivers cannot be recalled or deleted</Li>
              <Li>Audit logs are retained for 2 years for security and legal compliance purposes</Li>
            </ul>
          </Section>

          <Section title="Who We Share Your Data With">
            <P>
              We do not sell, rent, or trade your personal data. We share it only with the
              following service providers who process data on our behalf:
            </P>
            <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
              <Li><strong>Cloudinary</strong> — media storage and delivery (photos, videos)</Li>
              <Li><strong>Resend</strong> — transactional email delivery</Li>
              <Li><strong>Neon</strong> — managed PostgreSQL database</Li>
              <Li><strong>Vercel</strong> — application hosting and deployment</Li>
            </ul>
            <P>
              All third-party providers are contractually obligated to handle your data
              securely and only for the purposes we specify.
            </P>
            <P>
              We may disclose your personal data if required to do so by Singapore law or
              a valid court order.
            </P>
          </Section>

          <Section title="Your Rights Under PDPA">
            <P>
              Under Singapore&rsquo;s Personal Data Protection Act, you have the right to:
            </P>
            <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
              <Li><strong>Access:</strong> Request a copy of the personal data we hold about you</Li>
              <Li><strong>Correction:</strong> Request correction of any inaccurate or incomplete data</Li>
              <Li><strong>Deletion:</strong> Request deletion of your account and all associated personal data</Li>
              <Li><strong>Withdrawal of consent:</strong> Withdraw your consent to data collection and use at any time (note: this will require account deletion)</Li>
              <Li><strong>Data portability:</strong> Request an export of your data in a machine-readable format</Li>
            </ul>
            <P>
              To exercise any of these rights, you can use the Privacy &amp; Data tab in your
              account settings, or contact us at davidks2014@gmail.com.
            </P>
          </Section>

          <Section title="Cookies and Tracking">
            <P>
              Time Bridge uses session cookies only to keep you signed in. We do not use
              tracking cookies, advertising cookies, or any third-party analytics. We do not
              track you across other websites.
            </P>
          </Section>

          <Section title="Children's Privacy">
            <P>
              Time Bridge is intended for users aged 18 and above. We do not knowingly collect
              personal data from anyone under 18. If you believe a minor has provided us with
              personal data, please contact us immediately.
            </P>
          </Section>

          <Section title="Changes to This Policy">
            <P>
              We may update this Privacy Policy from time to time. Material changes will be
              communicated to you by email or through a notice in the app. Continued use of
              Time Bridge after any changes constitutes acceptance of the updated policy.
            </P>
          </Section>

          <Section title="Data Protection Officer">
            <P>
              For any questions or concerns about how we handle your personal data, or to
              exercise your PDPA rights, please contact:
            </P>
            <div style={{
              padding: "16px 20px",
              background: "var(--gold-pale)",
              border: "1px solid var(--sand-dark)",
              borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              lineHeight: 1.8,
            }}>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>Lee Kok Sang</strong><br />
              Data Protection Officer, Time Bridge<br />
              <a href="mailto:davidks2014@gmail.com" style={{ color: "var(--gold)", textDecoration: "none" }}>
                davidks2014@gmail.com
              </a><br />
              Response time: within 3 business days
            </div>
          </Section>

          <Section title="Governing Law">
            <P>
              This Privacy Policy is governed by the laws of Singapore. Any disputes arising
              from this policy shall be subject to the exclusive jurisdiction of the Singapore courts.
            </P>
          </Section>

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
