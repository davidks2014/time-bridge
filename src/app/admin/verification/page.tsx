// src/app/admin/verification/page.tsx
"use client";

/**
 * Admin Verification Dashboard
 *
 * Page: /admin/verification
 *
 * Features:
 * - List PENDING users (GET /api/admin/verification/pending)
 * - Show verification document images
 * - Approve / Reject (POST /api/admin/verification/decision)
 *
 * Security:
 * - If not logged in -> /login
 * - If not ADMIN -> redirect to /dashboard (server also enforces)
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type PendingUser = {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  identificationNo: string;
  address: string;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  verificationDocFrontUrl: string | null;
  verificationDocBackUrl: string | null;
  createdAt: string;
};

export default function AdminVerificationPage() {
  const router = useRouter();
  const { status, data: session } = useSession();

  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Per-user reject reason input
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  // Per-user action loading
  const [acting, setActing] = useState<Record<string, boolean>>({});

  const pendingCount = useMemo(() => users.length, [users]);

  const role = (session?.user as any)?.role as "USER" | "ADMIN" | undefined;

  /**
   * Auth:
   * - If not logged in -> /login
   * - If logged in but not admin -> /dashboard
   */
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (role && role !== "ADMIN") router.replace("/dashboard");
  }, [status, role, router]);

  /**
   * Load pending list
   */
  async function loadPending() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/verification/pending", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed to load pending verifications.");
        setUsers([]);
        return;
      }

      setUsers(json.users ?? []);
    } catch {
      setError("Network error.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  /**
   * After login, load pending.
   */
  useEffect(() => {
    if (status === "authenticated" && role === "ADMIN") loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, role]);

  /**
   * Approve user
   */
  async function approveUser(userId: string) {
    setError("");
    setActing((prev) => ({ ...prev, [userId]: true }));

    try {
      const res = await fetch("/api/admin/verification/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, decision: "APPROVE" }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Approve failed.");
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      setError("Network error.");
    } finally {
      setActing((prev) => ({ ...prev, [userId]: false }));
    }
  }

  /**
   * Reject user
   */
  async function rejectUser(userId: string) {
    setError("");
    const reason = (rejectReasons[userId] ?? "").trim();
    if (!reason) {
      setError("Reject reason is required.");
      return;
    }

    setActing((prev) => ({ ...prev, [userId]: true }));

    try {
      const res = await fetch("/api/admin/verification/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, decision: "REJECT", rejectReason: reason }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Reject failed.");
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      setError("Network error.");
    } finally {
      setActing((prev) => ({ ...prev, [userId]: false }));
    }
  }

  function Pill({ text }: { text: string }) {
    return (
      <span
        style={{
          display: "inline-flex",
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid #e5e7eb",
          background: "#f9fafb",
          fontSize: 12,
          fontWeight: 800,
          color: "#111827",
        }}
      >
        {text}
      </span>
    );
  }

  if (status === "loading" || loading) return <TimeBridgeLoading message="Loading verification queue..." />;

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header / Summary Bar */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 16,
          background: "white",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Admin Verification</h1>
              <Pill text={`Pending: ${loading ? "..." : pendingCount}`} />
            </div>

            <div style={{ color: "#6b7280", marginTop: 6 }}>
              Review identity documents submitted during registration.
            </div>

            <div style={{ color: "#9ca3af", marginTop: 6, fontSize: 12 }}>
              Logged in as: {session?.user?.email ?? "-"} {role ? `(${role})` : ""}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => loadPending()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button onClick={() => router.push("/dashboard")}>User Dashboard</button>

            <button onClick={() => signOut({ callbackUrl: "/login" })}>Logout</button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            border: "1px solid #fecaca",
            borderRadius: 12,
            background: "#fff1f2",
            color: "#991b1b",
            fontWeight: 700,
          }}
        >
          {error}
          <div style={{ marginTop: 6, color: "#7f1d1d", fontSize: 12, fontWeight: 600 }}>
            If you see “Forbidden. Admin only.” you are not logged in as an ADMIN user.
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ marginTop: 16 }}>
        {loading ? (
          <div style={{ color: "#6b7280" }}>Loading pending users...</div>
        ) : users.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No pending verifications.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {users.map((u) => {
              const busy = !!acting[u.id];

              return (
                <div
                  key={u.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    padding: 16,
                    background: "white",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Top Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 14 }}>
                    {/* User summary */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 900, fontSize: 16 }}>
                          {u.name}{" "}
                          <span style={{ color: "#6b7280", fontWeight: 700 }}>
                            ({u.email})
                          </span>
                        </div>
                        <Pill text={u.verificationStatus} />
                      </div>

                      <div style={{ marginTop: 10, display: "grid", gap: 6, color: "#374151" }}>
                        <div>
                          Phone: <b>{u.phoneNumber}</b>
                        </div>
                        <div>
                          ID No: <b>{u.identificationNo}</b>
                        </div>
                        <div>
                          Address: <b>{u.address}</b>
                        </div>
                      </div>

                      <div style={{ marginTop: 10, fontSize: 12, color: "#9ca3af" }}>
                        Submitted: {new Date(u.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div
                      style={{
                        border: "1px solid #f3f4f6",
                        borderRadius: 14,
                        padding: 12,
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>Decision</div>

                      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                        <button onClick={() => approveUser(u.id)} disabled={busy}>
                          {busy ? "Working..." : "Approve"}
                        </button>

                        <button onClick={() => rejectUser(u.id)} disabled={busy}>
                          {busy ? "Working..." : "Reject"}
                        </button>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", marginBottom: 6 }}>
                          Reject reason (required if rejecting)
                        </div>
                        <textarea
                          rows={2}
                          placeholder="Example: Photo unclear / ID mismatch"
                          value={rejectReasons[u.id] ?? ""}
                          onChange={(e) =>
                            setRejectReasons((prev) => ({ ...prev, [u.id]: e.target.value }))
                          }
                          style={{ width: "100%", borderRadius: 10, padding: 10 }}
                          disabled={busy}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontWeight: 900, marginBottom: 10 }}>Verification Documents</div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                      }}
                    >
                      {/* Front */}
                      <div style={{ border: "1px solid #f3f4f6", borderRadius: 14, padding: 12 }}>
                        <div style={{ fontWeight: 900, marginBottom: 8 }}>Front</div>
                        {u.verificationDocFrontUrl ? (
                          <>
                            <img
                              src={u.verificationDocFrontUrl}
                              alt="Verification document front"
                              style={{
                                width: "100%",
                                borderRadius: 12,
                                border: "1px solid #e5e7eb",
                              }}
                            />
                            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                              URL:{" "}
                              <span style={{ wordBreak: "break-all" }}>
                                {u.verificationDocFrontUrl}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div style={{ color: "#6b7280" }}>No front image uploaded.</div>
                        )}
                      </div>

                      {/* Back */}
                      <div style={{ border: "1px solid #f3f4f6", borderRadius: 14, padding: 12 }}>
                        <div style={{ fontWeight: 900, marginBottom: 8 }}>Back (optional)</div>
                        {u.verificationDocBackUrl ? (
                          <>
                            <img
                              src={u.verificationDocBackUrl}
                              alt="Verification document back"
                              style={{
                                width: "100%",
                                borderRadius: 12,
                                border: "1px solid #e5e7eb",
                              }}
                            />
                            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                              URL:{" "}
                              <span style={{ wordBreak: "break-all" }}>
                                {u.verificationDocBackUrl}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div style={{ color: "#6b7280" }}>No back image uploaded.</div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12, color: "#9ca3af" }}>
                      If images don’t display, the URLs are not reachable by the browser (must be public URL or served from your app).
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* small responsive fallback */}
      <style jsx>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 1fr 360px"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}