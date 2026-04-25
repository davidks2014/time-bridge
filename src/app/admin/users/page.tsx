/**
 * src/app/admin/users/page.tsx
 *
 * Purpose:
 * - Admin views all users
 * - Force approve/reject verification
 * - Reset proof-of-life stage
 * - See memory counts and proof-of-life status
 */

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  verificationStatus: string;
  identificationNo: string | null;
  phoneNumber: string | null;
  proofOfLifeStage: string;
  lastConfirmedAt: string | null;
  missedConfirmations: number;
  createdAt: string;
  _count: { collections: number };
};

const verificationColor = (status: string) => {
  if (status === "APPROVED") return { bg: "#f0fdf8", text: "#065f46", border: "#6ee7b7" };
  if (status === "PENDING") return { bg: "#fffbeb", text: "#92400e", border: "#fde68a" };
  if (status === "REJECTED") return { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" };
  return { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" };
};

const proofColor = (stage: string) => {
  if (stage === "NORMAL") return "#065f46";
  if (stage === "WARNING") return "#92400e";
  if (stage === "CRITICAL") return "#991b1b";
  return "#6b7280";
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [acting, setActing] = useState<Record<string, boolean>>({});
  const [actionMessage, setActionMessage] = useState("");

  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      if (role && role !== "ADMIN") router.replace("/dashboard");
      else loadUsers();
    }
  }, [status, role]);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to load users.");
        return;
      }
      setUsers(json.users ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function performAction(userId: string, action: string) {
    setActing((prev) => ({ ...prev, [userId]: true }));
    setActionMessage("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Action failed.");
        return;
      }
      setActionMessage(json.message);
      await loadUsers();
    } catch {
      setError("Network error.");
    } finally {
      setActing((prev) => ({ ...prev, [userId]: false }));
    }
  }

  const filtered = users.filter((u) => {
    if (filter === "ALL") return u.role !== "ADMIN";
    return u.verificationStatus === filter && u.role !== "ADMIN";
  });

  if (status === "loading" || loading) return <TimeBridgeLoading message="Loading users..." />;

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>User Management</h1>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
            {filtered.length} users shown
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/admin")}>Back to admin</button>
          <button onClick={loadUsers}>Refresh</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
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
            {f === "ALL"
              ? `All Users (${users.filter((u) => u.role !== "ADMIN").length})`
              : `${f} (${users.filter((u) => u.verificationStatus === f && u.role !== "ADMIN").length})`}
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

      {actionMessage && (
        <div style={{
          padding: "10px 14px",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 8,
          color: "#166534",
          fontSize: 13,
          marginBottom: 16,
        }}>
          {actionMessage}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ color: "#6b7280", padding: 20, textAlign: "center" }}>
          No users found.
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((user) => {
          const vColors = verificationColor(user.verificationStatus);
          const busy = !!acting[user.id];

          return (
            <div key={user.id} style={{
              border: `1px solid ${vColors.border}`,
              borderRadius: 14,
              padding: 16,
              background: vColors.bg,
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 8,
              }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>
                    {user.name}
                    <span style={{
                      marginLeft: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: vColors.bg,
                      color: vColors.text,
                      border: `1px solid ${vColors.border}`,
                    }}>
                      {user.verificationStatus}
                    </span>
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
                    {user.email}
                  </div>
                  <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
                    NRIC: {user.identificationNo ?? "Not set"} ·
                    Phone: {user.phoneNumber ?? "Not set"} ·
                    Memories: {user._count.collections}
                  </div>
                  <div style={{
                    marginTop: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: proofColor(user.proofOfLifeStage),
                  }}>
                    Proof-of-life: {user.proofOfLifeStage} ·
                    Missed: {user.missedConfirmations} ·
                    Last confirmed: {user.lastConfirmedAt
                      ? new Date(user.lastConfirmedAt).toLocaleDateString("en-SG")
                      : "Never"}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {user.verificationStatus === "PENDING" && (
                    <>
                      <button
                        onClick={() => performAction(user.id, "FORCE_APPROVE")}
                        disabled={busy}
                        style={{
                          background: "#1D9E75",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          padding: "6px 12px",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Force Approve
                      </button>
                      <button
                        onClick={() => performAction(user.id, "FORCE_REJECT")}
                        disabled={busy}
                        style={{
                          background: "#dc2626",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          padding: "6px 12px",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Force Reject
                      </button>
                    </>
                  )}
                  {user.proofOfLifeStage !== "NORMAL" && (
                    <button
                      onClick={() => performAction(user.id, "RESET_PROOF")}
                      disabled={busy}
                      style={{
                        background: "#f59e0b",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Reset Proof-of-life
                    </button>
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
