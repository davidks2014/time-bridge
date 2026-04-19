/**
 * src/app/profile/page.tsx
 *
 * Purpose:
 * - User profile and settings page
 * - Update trusted contact details (task 2.13, 2.18)
 * - Change proof-of-life confirmation interval (task 2.13)
 * - Activate holiday snooze (task 2.18)
 * - Export all personal data (task 2.18)
 * - Delete account (task 2.18)
 */

"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

type ProfileData = {
  name: string;
  email: string;
  phoneNumber: string;
  identificationNo: string;
  address: string;
  confirmationIntervalDays: number;
  trustedContactName: string | null;
  trustedContactNric: string | null;
  trustedContactEmail: string | null;
  trustedContactPhone: string | null;
  snoozedUntil: string | null;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Proof-of-life interval
  const [confirmationIntervalDays, setConfirmationIntervalDays] = useState<30 | 60 | 90>(30);

  // Trusted contact fields
  const [trustedContactName, setTrustedContactName] = useState("");
  const [trustedContactNric, setTrustedContactNric] = useState("");
  const [trustedContactEmail, setTrustedContactEmail] = useState("");
  const [trustedContactPhone, setTrustedContactPhone] = useState("");

  // Holiday snooze
  const [snoozeDays, setSnoozeDays] = useState<30 | 60>(30);
  const [snoozing, setSnoozing] = useState(false);

  // Account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Load profile data on mount
  useEffect(() => {
    if (status === "authenticated") loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed to load profile.");
        return;
      }

      const p = json.profile as ProfileData;
      setProfile(p);

      // Pre-fill form fields with current values
      setConfirmationIntervalDays(
        ([30, 60, 90].includes(p.confirmationIntervalDays)
          ? p.confirmationIntervalDays
          : 30) as 30 | 60 | 90
      );
      setTrustedContactName(p.trustedContactName ?? "");
      setTrustedContactNric(p.trustedContactNric ?? "");
      setTrustedContactEmail(p.trustedContactEmail ?? "");
      setTrustedContactPhone(p.trustedContactPhone ?? "");

    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setError("");
    setInfo("");
    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmationIntervalDays,
          trustedContactName: trustedContactName.trim() || null,
          trustedContactNric: trustedContactNric.trim() || null,
          trustedContactEmail: trustedContactEmail.trim() || null,
          trustedContactPhone: trustedContactPhone.trim() || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed to save settings.");
        return;
      }

      setInfo("Settings saved successfully.");
      await loadProfile();

    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function activateSnooze() {
    setError("");
    setInfo("");
    setSnoozing(true);

    try {
      const res = await fetch("/api/profile/snooze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: snoozeDays }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed to activate snooze.");
        return;
      }

      setInfo(`Holiday snooze activated for ${snoozeDays} days. Proof-of-life checks paused.`);
      await loadProfile();

    } catch {
      setError("Network error.");
    } finally {
      setSnoozing(false);
    }
  }

  async function cancelSnooze() {
    setError("");
    setInfo("");

    try {
      const res = await fetch("/api/profile/snooze", {
        method: "DELETE",
      });

      if (!res.ok) {
        setError("Failed to cancel snooze.");
        return;
      }

      setInfo("Holiday snooze cancelled. Proof-of-life checks resumed.");
      await loadProfile();

    } catch {
      setError("Network error.");
    }
  }

  async function exportData() {
    setError("");
    setInfo("Preparing your data export... this may take a moment.");

    try {
      const res = await fetch("/api/profile/export");

      if (!res.ok) {
        setError("Failed to export data.");
        setInfo("");
        return;
      }

      // Download the JSON file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timebridge-data-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setInfo("Data exported successfully. Check your downloads folder.");

    } catch {
      setError("Network error.");
      setInfo("");
    }
  }

  async function deleteAccount() {
    if (deleteConfirmText !== "DELETE") {
      setError("Please type DELETE to confirm account deletion.");
      return;
    }

    setError("");
    setDeleting(true);

    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
      });

      if (!res.ok) {
        setError("Failed to delete account. Please contact support.");
        return;
      }

      // Sign out and redirect after deletion
      await signOut({ callbackUrl: "/login" });

    } catch {
      setError("Network error.");
    } finally {
      setDeleting(false);
    }
  }

  if (status === "loading" || loading) {
    return <div style={{ padding: 20 }}>Loading profile...</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Profile & Settings</h1>
        <button onClick={() => router.push("/dashboard")}>Back to dashboard</button>
      </div>

      {/* Profile summary */}
      {profile && (
        <div style={{
          marginTop: 20,
          padding: 16,
          background: "#f9fafb",
          borderRadius: 12,
          border: "1px solid #eee",
        }}>
          <div style={{ fontWeight: 700 }}>{profile.name}</div>
          <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>{profile.email}</div>
          {profile.identificationNo && (
            <div style={{ color: "#666", fontSize: 13 }}>NRIC: {profile.identificationNo}</div>
          )}
        </div>
      )}

      {/* ── Proof-of-life interval ── */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Proof-of-life reminder frequency</div>
        <div style={{ color: "#666", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
          How often would you like to receive a reminder to confirm you are well?
          If you do not respond, your trusted contact will be alerted.
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          {([30, 60, 90] as const).map((days) => (
            <label
              key={days}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                padding: "8px 16px",
                border: `1px solid ${confirmationIntervalDays === days ? "#1D9E75" : "#ddd"}`,
                borderRadius: 8,
                background: confirmationIntervalDays === days ? "#f0fdf8" : "white",
                fontSize: 14,
              }}
            >
              <input
                type="radio"
                name="interval"
                checked={confirmationIntervalDays === days}
                onChange={() => setConfirmationIntervalDays(days)}
              />
              Every {days} days
            </label>
          ))}
        </div>
      </div>

      {/* ── Trusted contact ── */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Trusted contact</div>
        <div style={{ color: "#666", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
          This person will be alerted if you stop responding to reminders.
          They will never see your messages — only asked to confirm your status.
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <input
            placeholder="Full name"
            value={trustedContactName}
            onChange={(e) => setTrustedContactName(e.target.value)}
          />
          <input
            placeholder="NRIC"
            value={trustedContactNric}
            onChange={(e) => setTrustedContactNric(e.target.value)}
          />
          <input
            placeholder="Email address"
            type="email"
            value={trustedContactEmail}
            onChange={(e) => setTrustedContactEmail(e.target.value)}
          />
          <input
            placeholder="Phone number"
            value={trustedContactPhone}
            onChange={(e) => setTrustedContactPhone(e.target.value)}
          />
        </div>
      </div>

      {/* ── Save button ── */}
      {error && (
        <div style={{
          marginTop: 12,
          padding: "10px 14px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 8,
          color: "#991b1b",
          fontSize: 13,
        }}>
          {error}
        </div>
      )}
      {info && (
        <div style={{
          marginTop: 12,
          padding: "10px 14px",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 8,
          color: "#166534",
          fontSize: 13,
        }}>
          {info}
        </div>
      )}

      <button
        onClick={saveSettings}
        disabled={saving}
        style={{ marginTop: 16, width: "100%" }}
      >
        {saving ? "Saving..." : "Save settings"}
      </button>

      {/* ── Holiday snooze ── */}
      <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #eee" }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Holiday snooze</div>
        <div style={{ color: "#666", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
          Going away and will not be able to confirm? Pause your proof-of-life
          checks temporarily so you are not marked as unresponsive.
        </div>

        {profile?.snoozedUntil ? (
          <div style={{ marginTop: 12 }}>
            <div style={{
              padding: "10px 14px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 8,
              color: "#92400e",
              fontSize: 13,
            }}>
              Snooze active until: {new Date(profile.snoozedUntil).toLocaleDateString("en-SG")}
            </div>
            <button onClick={cancelSnooze} style={{ marginTop: 10 }}>
              Cancel snooze
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={snoozeDays}
              onChange={(e) => setSnoozeDays(Number(e.target.value) as 30 | 60)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" }}
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
            </select>
            <button onClick={activateSnooze} disabled={snoozing}>
              {snoozing ? "Activating..." : "Activate holiday snooze"}
            </button>
          </div>
        )}
      </div>

      {/* ── Data export ── */}
      <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #eee" }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Export my data</div>
        <div style={{ color: "#666", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
          Download a copy of all your personal data stored in Time Bridge.
          This includes your profile, memories, and receiver details.
        </div>
        <button onClick={exportData} style={{ marginTop: 12 }}>
          Download my data
        </button>
      </div>

      {/* ── Delete account ── */}
      <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #eee" }}>
        <div style={{ fontWeight: 900, fontSize: 16, color: "#991b1b" }}>Delete account</div>
        <div style={{ color: "#666", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
          Permanently delete your account and all your memories.
          This cannot be undone. All your messages, attachments, and receiver
          records will be permanently removed within 30 days.
        </div>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              marginTop: 12,
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            Delete my account
          </button>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 13, color: "#991b1b", fontWeight: 600 }}>
              Type DELETE to confirm permanent account deletion:
            </div>
            <input
              placeholder="Type DELETE here"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={deleteAccount}
                disabled={deleting || deleteConfirmText !== "DELETE"}
                style={{
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  cursor: "pointer",
                }}
              >
                {deleting ? "Deleting..." : "Permanently delete account"}
              </button>
              <button onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmText("");
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
