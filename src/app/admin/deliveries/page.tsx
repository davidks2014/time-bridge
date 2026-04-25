/**
 * src/app/admin/deliveries/page.tsx
 *
 * Purpose:
 * - Admin views all delivery attempts
 * - Filter by status — ALL / DELIVERED / FAILED / PENDING
 */

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type DeliveryAttempt = {
  id: string;
  channel: string;
  status: string;
  notes: string | null;
  attemptedAt: string;
  receiver: {
    id: string;
    fullName: string;
    identificationNo: string;
    email: string | null;
    linkedUserId: string | null;
  };
};

const statusColor = (status: string) => {
  if (status === "DELIVERED" || status === "SENT") {
    return { bg: "#f0fdf8", text: "#065f46", border: "#6ee7b7" };
  }
  if (status === "FAILED") {
    return { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" };
  }
  return { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" };
};

const channelIcon = (channel: string) => {
  if (channel === "EMAIL") return "✉️";
  if (channel === "GUARDIAN") return "👨‍👦";
  if (channel === "TRUSTED_CONTACT") return "🤝";
  if (channel === "ADMIN") return "👤";
  return "📬";
};

export default function AdminDeliveriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [attempts, setAttempts] = useState<DeliveryAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "DELIVERED" | "FAILED" | "PENDING">("ALL");

  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      if (role && role !== "ADMIN") router.replace("/dashboard");
      else loadAttempts();
    }
  }, [status, role, filter]);

  async function loadAttempts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/deliveries?status=${filter}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to load delivery attempts.");
        return;
      }
      setAttempts(json.attempts ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || loading) return <TimeBridgeLoading message="Loading delivery attempts..." />;

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Delivery Attempts</h1>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
            {attempts.length} attempts shown (last 100)
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/admin")}>Back to admin</button>
          <button onClick={loadAttempts}>Refresh</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["ALL", "DELIVERED", "FAILED", "PENDING"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? "#1D9E75" : "white",
              color: filter === f ? "white" : "#374151",
              border: `1px solid ${filter === f ? "#1D9E75" : "#e5e7eb"}`,
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {f}
          </button>
        ))}
      </div>

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

      {attempts.length === 0 && (
        <div style={{ color: "#6b7280", padding: 20, textAlign: "center" }}>
          No delivery attempts found.
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {attempts.map((attempt) => {
          const colors = statusColor(attempt.status);
          return (
            <div key={attempt.id} style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: 14,
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
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {channelIcon(attempt.channel)} {attempt.channel}
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
                      {attempt.status}
                    </span>
                  </div>
                  <div style={{ color: "#374151", fontSize: 13, marginTop: 6 }}>
                    <b>{attempt.receiver.fullName}</b> — {attempt.receiver.identificationNo}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                    {attempt.receiver.email ?? "No email"}
                    {attempt.receiver.linkedUserId && (
                      <span style={{ color: "#166534", marginLeft: 8, fontWeight: 600 }}>
                        ✓ Claimed
                      </span>
                    )}
                  </div>
                  {attempt.notes && (
                    <div style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "#6b7280",
                      lineHeight: 1.5,
                    }}>
                      {attempt.notes}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>
                  {new Date(attempt.attemptedAt).toLocaleString("en-SG", {
                    timeZone: "Asia/Singapore",
                  })} SGT
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
