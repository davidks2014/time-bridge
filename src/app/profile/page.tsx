"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type ProfileData = {
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  identificationNo: string;
  verificationStatus: string;
  proofOfLifeIntervalDays: number;
  proofOfLifeStage: string;
  lastConfirmedAt: string | null;
  snoozedUntil: string | null;
  trustedContactName: string;
  trustedContactEmail: string;
  trustedContactPhone: string;
  trustedContactNric: string;
  trustedContactAddress: string;
  storageUsedMB: number;
  storageLimitMB: number;
};

type Tab = "account" | "trusted" | "privacy";

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();

  const [profile, setProfile]   = useState<ProfileData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg]     = useState("");

  // Account fields
  const [phone, setPhone]     = useState("");
  const [address, setAddress] = useState("");
  const [interval, setInterval] = useState(30);

  // Trusted contact fields
  const [tcName, setTcName]       = useState("");
  const [tcEmail, setTcEmail]     = useState("");
  const [tcPhone, setTcPhone]     = useState("");
  const [tcNric, setTcNric]       = useState("");
  const [tcAddress, setTcAddress] = useState("");

  // Snooze
  const [snoozeDate, setSnoozeDate] = useState("");
  const [snoozeSaving, setSnoozeSaving] = useState(false);

  // Export / Delete
  const [exporting, setExporting]   = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") loadProfile();
  }, [status]);

  async function loadProfile() {
    setLoading(true);
    try {
      const res  = await fetch("/api/profile");
      const json = await res.json();
      const p    = json.profile ?? json;
      setProfile(p);
      setPhone(p.phoneNumber ?? "");
      setAddress(p.address ?? "");
      setInterval(p.proofOfLifeIntervalDays ?? 30);
      setTcName(p.trustedContactName ?? "");
      setTcEmail(p.trustedContactEmail ?? "");
      setTcPhone(p.trustedContactPhone ?? "");
      setTcNric(p.trustedContactNric ?? "");
      setTcAddress(p.trustedContactAddress ?? "");
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          address,
          proofOfLifeIntervalDays: interval,
          trustedContactName: tcName,
          trustedContactEmail: tcEmail,
          trustedContactPhone: tcPhone,
          trustedContactNric: tcNric,
          trustedContactAddress: tcAddress,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setErrorMsg(json?.error ?? "Save failed."); return; }
      setSuccessMsg("Settings saved successfully.");
      await loadProfile();
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSnooze() {
    if (!snoozeDate) return;
    setSnoozeSaving(true);
    try {
      await fetch("/api/profile/snooze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snoozedUntil: new Date(snoozeDate).toISOString() }),
      });
      setSuccessMsg("Holiday snooze set. Proof-of-life checks are paused until " + new Date(snoozeDate).toLocaleDateString("en-SG") + ".");
      await loadProfile();
    } catch {
      setErrorMsg("Failed to set snooze.");
    } finally {
      setSnoozeSaving(false);
    }
  }

  async function clearSnooze() {
    setSnoozeSaving(true);
    try {
      await fetch("/api/profile/snooze", {
        method: "DELETE",
      });
      setSuccessMsg("Snooze cleared. Proof-of-life checks resumed.");
      await loadProfile();
    } catch {
      setErrorMsg("Failed to clear snooze.");
    } finally {
      setSnoozeSaving(false);
    }
  }

  async function exportData() {
    setExporting(true);
    try {
      const res  = await fetch("/api/profile/export");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `timebridge-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorMsg("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") {
      setErrorMsg('Type "DELETE" to confirm account deletion.');
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (res.ok) router.push("/login");
      else setErrorMsg("Deletion failed. Please try again.");
    } catch {
      setErrorMsg("Network error.");
    } finally {
      setDeleting(false);
    }
  }

  if (status === "loading" || loading) {
    return <TimeBridgeLoading message="Loading your profile..." />;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "account", label: "Account" },
    { id: "trusted", label: "Trusted Contact" },
    { id: "privacy", label: "Privacy & Data" },
  ];

  const proofColor =
    profile?.proofOfLifeStage === "CRITICAL" ? "#7F1D1D"
    : profile?.proofOfLifeStage === "WARNING" ? "var(--gold)"
    : "var(--sage)";

  const storageUsedMB  = profile?.storageUsedMB  ?? 0;
  const storageLimitMB = profile?.storageLimitMB ?? 1024;
  const storagePct     = Math.min((storageUsedMB / storageLimitMB) * 100, 100);

  return (
    <div className="tb-page tb-page-with-tabs">
      <div className="tb-container" style={{ paddingTop: 32, paddingBottom: 48 }}>

        {/* Header */}
        <div className="tb-page-header tb-fade-in">
          <h1>Profile & Settings</h1>
          <p style={{ color: "var(--earth-muted)", fontSize: 14, marginTop: 6 }}>
            {profile?.name} · {profile?.email}
          </p>
          <span className={`tb-badge ${
            profile?.verificationStatus === "APPROVED" ? "tb-badge-approved"
            : profile?.verificationStatus === "PENDING" ? "tb-badge-pending"
            : "tb-badge-rejected"
          }`} style={{ marginTop: 10, display: "inline-block" }}>
            {profile?.verificationStatus}
          </span>
        </div>

        {/* Success / Error */}
        {successMsg && (
          <div className="tb-banner tb-banner-sage tb-fade-in">
            <div className="tb-banner-dot tb-banner-dot-sage" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="tb-banner tb-banner-error tb-fade-in">
            <div className="tb-banner-dot tb-banner-dot-red" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="tb-fade-in tb-stagger-1" style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--border)",
          marginBottom: 28,
          overflowX: "auto",
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSuccessMsg(""); setErrorMsg(""); }}
              style={{
                padding: "12px 20px",
                border: "none",
                borderBottom: `2px solid ${activeTab === tab.id ? "var(--gold)" : "transparent"}`,
                background: "transparent",
                color: activeTab === tab.id ? "var(--gold)" : "var(--earth-muted)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.5px",
                transition: "all var(--transition)",
                whiteSpace: "nowrap",
                minHeight: 44,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Account ── */}
        {activeTab === "account" && (
          <div className="tb-fade-in">

            {/* Storage usage */}
            <div style={{
              padding: "16px 20px",
              background: "#FAF7F2",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              marginBottom: 24,
            }}>
              <div className="tb-section-label" style={{ marginBottom: 10 }}>Storage</div>
              <div style={{
                height: 8,
                background: "var(--cream)",
                borderRadius: 9999,
                overflow: "hidden",
                marginBottom: 8,
              }}>
                <div style={{
                  height: "100%",
                  width: `${storagePct}%`,
                  background: storagePct >= 100 ? "#DC2626" : "#B8965A",
                  borderRadius: 9999,
                }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--earth-muted)" }}>
                {storageUsedMB.toFixed(2)} MB used of {storageLimitMB} MB
              </div>
              {storagePct >= 100 && (
                <div style={{ fontSize: 12, color: "#DC2626", marginTop: 6, fontWeight: 600 }}>
                  Storage full. Please delete files or upgrade your plan.
                </div>
              )}
              {storagePct >= 80 && storagePct < 100 && (
                <div style={{ fontSize: 12, color: "#D97706", marginTop: 6, fontWeight: 600 }}>
                  You are running low on storage. Consider upgrading your plan.
                </div>
              )}
            </div>

            {/* Proof of life status */}
            <div style={{
              padding: "16px 20px",
              background: "var(--cream)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              marginBottom: 24,
            }}>
              <div className="tb-section-label" style={{ marginBottom: 10 }}>Proof-of-life status</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--earth-muted)", marginBottom: 2 }}>CURRENT STAGE</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: proofColor }}>
                    {profile?.proofOfLifeStage}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--earth-muted)", marginBottom: 2 }}>LAST CONFIRMED</div>
                  <div style={{ fontSize: 13, color: "var(--earth-mid)" }}>
                    {profile?.lastConfirmedAt
                      ? new Date(profile.lastConfirmedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })
                      : "Never"}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact details */}
            <div className="tb-field">
              <label className="tb-label">Phone number</label>
              <input className="tb-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 91234567" />
            </div>

            <div className="tb-field">
              <label className="tb-label">Residential address</label>
              <input className="tb-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Block, street, unit, postal code" />
            </div>

            {/* Proof of life interval */}
            <div className="tb-field">
              <label className="tb-label">Proof-of-life check interval</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[30, 60, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setInterval(days)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      border: `1px solid ${interval === days ? "var(--gold-light)" : "var(--border-dark)"}`,
                      borderRadius: "var(--radius-sm)",
                      background: interval === days ? "var(--gold-pale)" : "var(--ivory)",
                      color: interval === days ? "var(--gold)" : "var(--earth-muted)",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      fontSize: 13,
                      fontWeight: 700,
                      transition: "all var(--transition)",
                      minHeight: 44,
                    }}
                  >
                    {days} days
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 11, color: "var(--earth-muted)" }}>
                You will receive a reminder if you have not confirmed within this period
              </span>
            </div>

            {/* Holiday snooze */}
            <div style={{
              padding: "16px 20px",
              background: "var(--cream)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              marginBottom: 24,
            }}>
              <div className="tb-section-label" style={{ marginBottom: 10 }}>Holiday snooze</div>
              <p style={{ fontSize: 13, color: "var(--earth-muted)", marginBottom: 14, lineHeight: 1.6 }}>
                Travelling or on holiday? Pause proof-of-life checks until a date you choose.
              </p>
              {profile?.snoozedUntil ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "var(--sage)", fontWeight: 700 }}>
                    ✓ Snoozed until {new Date(profile.snoozedUntil).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <button
                    className="tb-btn tb-btn-outline"
                    onClick={clearSnooze}
                    disabled={snoozeSaving}
                    style={{ padding: "6px 14px", fontSize: 11 }}
                  >
                    Clear snooze
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    className="tb-input"
                    type="date"
                    value={snoozeDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setSnoozeDate(e.target.value)}
                    style={{ flex: 1, minWidth: 160 }}
                  />
                  <button
                    className="tb-btn tb-btn-sage"
                    onClick={saveSnooze}
                    disabled={snoozeSaving || !snoozeDate}
                    style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.5px", flexShrink: 0 }}
                  >
                    {snoozeSaving ? "Saving..." : "Set snooze"}
                  </button>
                </div>
              )}
            </div>

            <button
              className="tb-btn tb-btn-primary tb-btn-full"
              onClick={saveProfile}
              disabled={saving}
              style={{ fontSize: 12, letterSpacing: "1.5px" }}
            >
              {saving ? "Saving..." : "Save settings"}
            </button>
          </div>
        )}

        {/* ── Tab: Trusted Contact ── */}
        {activeTab === "trusted" && (
          <div className="tb-fade-in">
            <div className="tb-banner tb-banner-gold" style={{ marginBottom: 24 }}>
              <div className="tb-banner-dot tb-banner-dot-gold" />
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                Your trusted contact is alerted if you enter the CRITICAL proof-of-life stage and are unreachable. They can help confirm you are safe.
              </div>
            </div>

            <div className="tb-field">
              <label className="tb-label">Full name</label>
              <input className="tb-input" value={tcName} onChange={(e) => setTcName(e.target.value)} placeholder="Ahmad Bin Ismail" />
            </div>
            <div className="tb-field">
              <label className="tb-label">NRIC</label>
              <input className="tb-input" value={tcNric} onChange={(e) => setTcNric(e.target.value.toUpperCase())} placeholder="S1234567A" />
            </div>
            <div className="tb-field">
              <label className="tb-label">Email address</label>
              <input className="tb-input" type="email" value={tcEmail} onChange={(e) => setTcEmail(e.target.value)} placeholder="contact@email.com" />
            </div>
            <div className="tb-field">
              <label className="tb-label">Phone number</label>
              <input className="tb-input" type="tel" value={tcPhone} onChange={(e) => setTcPhone(e.target.value)} placeholder="91234567" />
            </div>
            <div className="tb-field">
              <label className="tb-label">Address</label>
              <input className="tb-input" value={tcAddress} onChange={(e) => setTcAddress(e.target.value)} placeholder="Residential address" />
            </div>

            <button
              className="tb-btn tb-btn-primary tb-btn-full"
              onClick={saveProfile}
              disabled={saving}
              style={{ fontSize: 12, letterSpacing: "1.5px" }}
            >
              {saving ? "Saving..." : "Save trusted contact"}
            </button>
          </div>
        )}

        {/* ── Tab: Privacy ── */}
        {activeTab === "privacy" && (
          <div className="tb-fade-in">

            {/* Export */}
            <div style={{
              padding: "20px",
              background: "var(--cream)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              marginBottom: 16,
            }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--earth)", marginBottom: 8 }}>
                Export your data
              </div>
              <p style={{ fontSize: 13, color: "var(--earth-muted)", marginBottom: 16, lineHeight: 1.6 }}>
                Download a copy of all your personal data stored in Time Bridge, including your profile, memories, and receivers. This is your right under PDPA.
              </p>
              <button
                className="tb-btn tb-btn-outline"
                onClick={exportData}
                disabled={exporting}
                style={{ fontSize: 11, letterSpacing: "0.5px" }}
              >
                {exporting ? "Preparing export..." : "⬇ Download my data"}
              </button>
            </div>

            {/* Delete */}
            <div style={{
              padding: "20px",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "var(--radius-md)",
            }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "#7F1D1D", marginBottom: 8 }}>
                Delete account
              </div>
              <p style={{ fontSize: 13, color: "#991B1B", marginBottom: 16, lineHeight: 1.6 }}>
                Permanently delete your account and all associated data. This cannot be undone. All your memories and receivers will be removed.
              </p>
              <div className="tb-field">
                <label className="tb-label" style={{ color: "#7F1D1D" }}>Type DELETE to confirm</label>
                <input
                  className="tb-input"
                  placeholder='Type "DELETE" here'
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  style={{ borderColor: "#FECACA" }}
                />
              </div>
              <button
                className="tb-btn tb-btn-danger"
                onClick={deleteAccount}
                disabled={deleting || deleteConfirm !== "DELETE"}
                style={{ fontSize: 11, letterSpacing: "0.5px" }}
              >
                {deleting ? "Deleting..." : "Permanently delete account"}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
