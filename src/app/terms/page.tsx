import type { Metadata } from "next";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Terms of Service — Time Bridge",
  description: "Terms and conditions for using Time Bridge, Singapore's legacy message platform.",
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
  return <li style={{ marginBottom: 8, paddingLeft: 8 }}>{children}</li>;
}

export default function TermsPage() {
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
            Terms of Service
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--earth-muted)" }}>
            Last updated: April 2026
          </p>
        </div>

        {/* Card */}
        <div className="tb-card" style={{ padding: "40px 40px 32px" }}>

          <Section title="Introduction">
            <P>
              Welcome to Time Bridge. These Terms of Service (&ldquo;Terms&rdquo;) govern your use
              of the Time Bridge platform (&ldquo;Service&rdquo;) operated by Lee Kok Sang as a
              personal project (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
            </P>
            <P>
              By creating an account or using Time Bridge, you agree to these Terms. Please read
              them carefully. If you do not agree, you must not use the Service.
            </P>
          </Section>

          <Section title="Service Description">
            <P>
              Time Bridge is a legacy message platform that allows users to create, store, and
              schedule the delivery of personal messages, photos, videos, and other content to
              designated receivers after the user&rsquo;s passing or upon other specified conditions.
            </P>
            <P>
              The Service includes:
            </P>
            <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
              <Li>Creation and secure storage of legacy messages and media</Li>
              <Li>Designation of receivers who will receive your messages</Li>
              <Li>Appointment of guardians who assist with the delivery process</Li>
              <Li>Proof-of-life monitoring to detect extended inactivity</Li>
              <Li>Identity verification services</Li>
            </ul>
          </Section>

          <Section title="User Eligibility">
            <P>To use Time Bridge, you must:</P>
            <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
              <Li>Be at least 18 years of age</Li>
              <Li>Have the legal capacity to enter into a binding agreement</Li>
              <Li>Provide accurate and complete information when creating your account</Li>
            </ul>
            <P>
              Time Bridge is primarily designed for Singapore residents. Users outside Singapore
              may access the Service, but delivery of messages to receivers outside Singapore
              may be subject to additional limitations.
            </P>
          </Section>

          <Section title="Account Responsibilities">
            <P>You are responsible for:</P>
            <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
              <Li>Keeping your account credentials confidential</Li>
              <Li>All activity that occurs under your account</Li>
              <Li>Responding to proof-of-life check-ins within the intervals you set</Li>
              <Li>Keeping your contact information, receiver details, and guardian information up to date</Li>
              <Li>Notifying us immediately if you suspect unauthorised access to your account</Li>
            </ul>
            <P>
              You must not share your account with any other person or allow others to use
              your account on your behalf.
            </P>
          </Section>

          <Section title="Acceptable Use">
            <P>You agree not to use Time Bridge to:</P>
            <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
              <Li>Store or send any content that is illegal under Singapore law</Li>
              <Li>Harass, threaten, or harm any person</Li>
              <Li>Store content that is defamatory, obscene, or sexually explicit</Li>
              <Li>Impersonate any person or entity</Li>
              <Li>Attempt to gain unauthorised access to any part of the Service</Li>
              <Li>Use the Service for any commercial purpose without our written consent</Li>
              <Li>Attempt to reverse-engineer or circumvent any security measures</Li>
            </ul>
            <P>
              We reserve the right to review content if we have reason to believe it violates
              these Terms, and to remove any content that does.
            </P>
          </Section>

          <Section title="Memory Delivery">
            <P>
              Time Bridge operates on a best-effort basis for message delivery. While we take
              every reasonable step to ensure your messages reach your designated receivers, we
              cannot guarantee:
            </P>
            <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
              <Li>Delivery by any specific date or time</Li>
              <Li>Successful delivery if receiver contact information is outdated or incorrect</Li>
              <Li>Delivery if email or phone services are unavailable</Li>
              <Li>That receivers will access or open delivered messages</Li>
            </ul>
            <P>
              It is your responsibility to keep receiver contact information current and to
              appoint guardians who can assist with the delivery process if needed.
            </P>
            <P>
              Once messages are delivered to a receiver, they cannot be recalled.
            </P>
          </Section>

          <Section title="Intellectual Property">
            <P>
              You retain full ownership of all content you create and store on Time Bridge,
              including messages, photos, videos, and other materials (&ldquo;Your Content&rdquo;).
            </P>
            <P>
              By using Time Bridge, you grant us a limited, non-exclusive licence to store,
              process, and deliver Your Content solely for the purpose of providing the Service
              to you. We do not claim any ownership of Your Content.
            </P>
            <P>
              You represent that you have the right to store all content you upload, and that
              doing so does not infringe any third-party rights.
            </P>
          </Section>

          <Section title="Storage Limits">
            <P>
              Each account is provided with a storage quota (currently 50 MB by default).
              If you require additional storage, please contact us. We reserve the right to
              adjust storage limits with reasonable notice.
            </P>
          </Section>

          <Section title="Service Availability">
            <P>
              We aim to keep Time Bridge available at all times, but we cannot guarantee
              uninterrupted access. The Service may be unavailable during maintenance, upgrades,
              or due to circumstances beyond our control.
            </P>
            <P>
              We will provide reasonable notice of planned maintenance that may affect the Service.
            </P>
          </Section>

          <Section title="Limitation of Liability">
            <P>
              To the maximum extent permitted by Singapore law, Time Bridge and its operator
              shall not be liable for:
            </P>
            <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
              <Li>Loss of data due to circumstances beyond our reasonable control</Li>
              <Li>Failure to deliver messages due to outdated or incorrect receiver information</Li>
              <Li>Any indirect, incidental, or consequential damages arising from your use of the Service</Li>
              <Li>Actions taken by receivers or guardians after message delivery</Li>
            </ul>
            <P>
              Our total liability to you for any claim arising from these Terms or your use of
              the Service shall not exceed the amount you have paid us (if any) in the 12 months
              preceding the claim. As Time Bridge is currently a free service, this amount is zero.
            </P>
          </Section>

          <Section title="Termination">
            <P>
              You may delete your account at any time through the Settings page in the app or
              by contacting us at davidks2014@gmail.com.
            </P>
            <P>
              We may suspend or terminate your account if you:
            </P>
            <ul style={{ paddingLeft: 20, margin: "0 0 12px" }}>
              <Li>Breach these Terms</Li>
              <Li>Use the Service for illegal purposes</Li>
              <Li>Provide false information during registration or verification</Li>
              <Li>Engage in conduct that is harmful to other users or to us</Li>
            </ul>
            <P>
              Upon termination, your data will be handled in accordance with our Privacy Policy.
              Messages already delivered to receivers will not be recalled.
            </P>
          </Section>

          <Section title="Changes to These Terms">
            <P>
              We may update these Terms from time to time. We will notify you of material changes
              by email or through a notice in the app. Continued use of Time Bridge after any
              changes constitutes your acceptance of the updated Terms.
            </P>
          </Section>

          <Section title="Governing Law">
            <P>
              These Terms are governed by the laws of Singapore. Any disputes arising from
              these Terms or your use of Time Bridge shall be subject to the exclusive
              jurisdiction of the Singapore courts.
            </P>
          </Section>

          <Section title="Contact">
            <P>
              For questions about these Terms, please contact:
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
              Time Bridge<br />
              <a href="mailto:davidks2014@gmail.com" style={{ color: "var(--gold)", textDecoration: "none" }}>
                davidks2014@gmail.com
              </a><br />
              Response time: within 3 business days
            </div>
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
