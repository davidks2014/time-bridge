/**
 * src/app/admin/visits/page.tsx
 *
 * Purpose:
 * - Admin records and views physical visits to receivers
 * - Each visit has an outcome and optional notes
 * - Visit logs are used to track delivery attempts
 */

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Visit = {
  id: string;
  visitDate: string;
  outcome: string;
  adminNotes: string | null;
  claimCode: string | null;
  claimCodeExpiresAt: string | null;
  conductedBy: string | null;
  createdAt: string;
  receiver: {
    id: string;
    fullName: string;
    identificationNo: string;
    email: string | null;
    address: string;
    linkedUserId: string | null;
  };
};

type Receiver = {
  id: string;
  fullName: string;
  identificationNo: string;
};

const OUTCOMES = [
  { value: "DELIVERED_AND_ACKNOWLEDGED", label: "Delivered and acknowledged" },
  { value: "LEFT_LETTER_NO_ONE_HOME", label: "Left letter — no one home" },
  { value: "ADDRESS_NOT_FOUND", label: "Address not found" },
  { value: "PERSON_CONFIRMED_NOT_RECEIVER", label: "Person confirmed — not the receiver" },
  { value: "REDIRECTED_TO_GUARDIAN", label: "Redirected to guardian" },
  { value: "OTHER", label: "Other — see notes" },
];

const outcomeColor = (outcome: string) => {
  if (outcome === "DELIVERED_AND_ACKNOWLEDGED") return { bg: "#f0fdf8", border: "#6ee7b7", text: "#065f46" };
  if (outcome === "LEFT_LETTER_NO_ONE_HOME") return { bg: "#fffbeb", border: "#fde68a", text: "#92400e" };
  if (outcome === "ADDRESS_NOT_FOUND") return { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" };
  if (outcome === "PERSON_CONFIRMED_NOT_RECEIVER") return { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" };
  if (outcome === "REDIRECTED_TO_GUARDIAN") return { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" };
  return { bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280" };
};

export default function AdminVisitsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  // New visit form
  const [receiverId, setReceiverId] = useState("");
  const [outcome, setOutcome] = useState("OTHER");
  const [adminNotes, setAdminNotes] = useState("");
  const [visitDate, setVisitDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      if (role && role !== "ADMIN") router.replace("/dashboard");
      else {
        loadVisits();
        loadReceivers();
      }
    }
  }, [status, role]);

  async function loadVisits() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/visits");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to load visits.");
        return;
      }
      setVisits(json.visits ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function loadReceivers() {
    try {
      const res = await fetch("/api/admin/receivers");
      const json = await res.json();
      if (res.ok) {
        setReceivers(
          (json.receivers ?? []).map((r: any) => ({
            id: r.id,
            fullName: r.fullName,
            identificationNo: r.identificationNo,
          }))
        );
      }
    } catch {}
  }

  async function recordVisit() {
    setFormError("");
    setFormSuccess("");

    if (!receiverId) return setFormError("Please select a receiver.");
    if (!adminNotes.trim() && outcome === "OTHER") {
      return setFormError("Please add notes when outcome is Other.");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, outcome, adminNotes, visitDate }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json?.error ?? "Failed to record visit.");
        return;
      }
      setFormSuccess("Visit recorded successfully.");
      setShowForm(false);
      setReceiverId("");
      setOutcome("OTHER");
      setAdminNotes("");
      await loadVisits();
    } catch {
      setFormError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || loading) {
    return <div style={{ padding: 20 }}>Loading visit logs...</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Visit Logs</h1>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
            {visits.length} total visits recorded
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{
              background: "#1D9E75",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {showForm ? "Cancel" : "+ Record visit"}
          </button>
          <button onClick={() => router.push("/admin")}>Back to admin</button>
          <button onClick={loadVisits}>Refresh</button>
        </div>
      </div>

      {/* Record visit form */}
      {showForm && (
        <div style={{
          padding: 16,
          border: "1px solid #bfdbfe",
          borderRadius: 12,
          background: "#eff6ff",
          marginBottom: 20,
        }}>
          <div style={{ fontWeight: 700, color: "#1e40af", marginBottom: 12 }}>
            Record a physical visit
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <select
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
            >
              <option value="">Select receiver *</option>
              {receivers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName} — {r.identificationNo}
                </option>
              ))}
            </select>

            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
            >
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <input
              type="datetime-local"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
            />

            <textarea
              placeholder="Visit notes — what happened, who you spoke to, next steps..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                resize: "vertical",
              }}
            />

            {formError && (
              <div style={{ color: "#991b1b", fontSize: 13 }}>{formError}</div>
            )}
            {formSuccess && (
              <div style={{ color: "#166534", fontSize: 13 }}>{formSuccess}</div>
            )}

            <button
              onClick={recordVisit}
              disabled={submitting}
            >
              {submitting ? "Recording..." : "Record visit"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          padding: "10px 14px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 8,
          color: "#991b1b",
          fontSize: 13,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {visits.length === 0 && (
        <div style={{ color: "#6b7280", padding: 20, textAlign: "center" }}>
          No visits recorded yet. Click "+ Record visit" to add one.
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {visits.map((visit) => {
          const colors = outcomeColor(visit.outcome);
          return (
            <div key={visit.id} style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 16,
              background: colors.bg,
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 8,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {visit.receiver.fullName}
                    <span style={{
                      marginLeft: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                    }}>
                      {visit.outcome.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
                    NRIC: {visit.receiver.identificationNo} · {visit.receiver.address}
                  </div>
                  {visit.adminNotes && (
                    <div style={{ color: "#374151", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
                      {visit.adminNotes}
                    </div>
                  )}
                  {visit.claimCode && (
                    <div style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: "#065f46",
                      fontFamily: "monospace",
                      fontWeight: 700,
                    }}>
                      Claim code: {visit.claimCode}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "right", fontSize: 12, color: "#9ca3af" }}>
                  <div>{new Date(visit.visitDate).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })} SGT</div>
                  {visit.receiver.linkedUserId && (
                    <div style={{ color: "#166534", marginTop: 4, fontWeight: 600 }}>
                      ✓ Receiver claimed
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
