/**
 * src/app/admin/audit/page.tsx
 *
 * Purpose:
 * - Admin views all audit log entries
 * - Filter by action type
 * - Paginated — 50 per page
 */

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  performedBy: { name: string; email: string } | null;
  details: Record<string, any> | null;
  createdAt: string;
};

const ACTION_FILTERS = [
  "ALL",
  "MEMORY",
  "GUARDIAN",
  "RECEIVER",
  "VERIFICATION",
];

const actionColor = (action: string) => {
  if (action.includes("RECALL")) return { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" };
  if (action.includes("GUARDIAN")) return { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" };
  if (action.includes("VERIFICATION")) return { bg: "#f0fdf8", text: "#065f46", border: "#6ee7b7" };
  if (action.includes("MEMORY")) return { bg: "#faf5ff", text: "#6b21a8", border: "#e9d5ff" };
  return { bg: "#f9fafb", text: "#374151", border: "#e5e7eb" };
};

export default function AdminAuditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      if (role && role !== "ADMIN") router.replace("/dashboard");
      else loadLogs();
    }
  }, [status, role, filter, page]);

  async function loadLogs() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/audit?action=${filter}&page=${page}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to load audit logs.");
        return;
      }
      setLogs(json.logs ?? []);
      setTotalPages(json.totalPages ?? 1);
      setTotal(json.total ?? 0);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || loading) {
    return <div style={{ padding: 20 }}>Loading audit logs...</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>

      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Audit Log</h1>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
            {total} total entries
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/admin")}>Back to admin</button>
          <button onClick={loadLogs}>Refresh</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {ACTION_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
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

      {logs.length === 0 && (
        <div style={{ color: "#6b7280", padding: 20, textAlign: "center" }}>
          No audit log entries found.
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {logs.map((log) => {
          const colors = actionColor(log.action);
          return (
            <div key={log.id} style={{
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
                  {/* Action */}
                  <div style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: colors.text,
                    fontFamily: "monospace",
                  }}>
                    {log.action}
                  </div>

                  {/* Entity */}
                  <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                    {log.entity}
                    {log.entityId && (
                      <span style={{ color: "#9ca3af", marginLeft: 6 }}>
                        #{log.entityId.slice(0, 8)}...
                      </span>
                    )}
                  </div>

                  {/* Performed by */}
                  {log.performedBy && (
                    <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                      By: {log.performedBy.name} ({log.performedBy.email})
                    </div>
                  )}

                  {/* Details */}
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div style={{
                      marginTop: 8,
                      padding: "6px 10px",
                      background: "white",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "#374151",
                      fontFamily: "monospace",
                      lineHeight: 1.6,
                    }}>
                      {Object.entries(log.details).map(([key, value]) => (
                        <div key={key}>
                          <span style={{ color: "#9ca3af" }}>{key}:</span>{" "}
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  whiteSpace: "nowrap",
                }}>
                  {new Date(log.createdAt).toLocaleString("en-SG", {
                    timeZone: "Asia/Singapore",
                  })} SGT
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          marginTop: 24,
        }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span style={{ color: "#6b7280", fontSize: 13 }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
