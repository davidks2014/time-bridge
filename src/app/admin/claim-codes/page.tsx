/**
 * src/app/admin/claim-codes/page.tsx
 *
 * Purpose:
 * - Admin views all generated claim codes
 * - See status — ACTIVE / USED / EXPIRED
 * - Generate new codes for specific receivers
 */

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type ClaimCode = {
  id: string;
  claimCode: string | null;
  claimCodeExpiresAt: string | null;
  visitDate: string;
  adminNotes: string | null;
  status: "ACTIVE" | "USED" | "EXPIRED";
  receiver: {
    id: string;
    fullName: string;
    identificationNo: string;
    email: string | null;
    isClaimed: boolean;
  };
};

export default function AdminClaimCodesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [codes, setCodes] = useState<ClaimCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "USED" | "EXPIRED">("ALL");

  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      if (role && role !== "ADMIN") router.replace("/dashboard");
      else loadCodes();
    }
  }, [status, role]);

  async function loadCodes() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/claim-codes/list");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to load claim codes.");
        return;
      }
      setCodes(json.codes ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = codes.filter((c) =>
    filter === "ALL" ? true : c.status === filter
  );

  const statusColor = (s: string) => {
    if (s === "ACTIVE") return { bg: "#f0fdf8", border: "#6ee7b7", text: "#065f46" };
    if (s === "USED") return { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" };
    return { bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280" };
  };

  if (status === "loading" || loading) return <TimeBridgeLoading message="Loading claim codes..." />;

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
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Claim Codes</h1>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
            {codes.filter((c) => c.status === "ACTIVE").length} active ·{" "}
            {codes.filter((c) => c.status === "USED").length} used ·{" "}
            {codes.filter((c) => c.status === "EXPIRED").length} expired
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/admin/receivers")}>
            Generate new code
          </button>
          <button onClick={() => router.push("/admin")}>Back to admin</button>
          <button onClick={loadCodes}>Refresh</button>
        </div>
      </div>

      {/* Info note */}
      <div style={{
        padding: "10px 14px",
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: 8,
        fontSize: 13,
        color: "#1e40af",
        marginBottom: 16,
        lineHeight: 1.6,
      }}>
        Claim codes are generated per receiver and given during physical visits.
        To generate a new code go to <b>Receiver Management</b> and click
        "Generate claim code" next to the receiver.
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["ALL", "ACTIVE", "USED", "EXPIRED"] as const).map((f) => (
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
            {f === "ALL" ? `All (${codes.length})`
              : `${f} (${codes.filter((c) => c.status === f).length})`}
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

      {filtered.length === 0 && (
        <div style={{ color: "#6b7280", padding: 20, textAlign: "center" }}>
          No claim codes found.
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.map((code) => {
          const colors = statusColor(code.status);
          return (
            <div key={code.id} style={{
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
                  {/* Claim code in large text */}
                  <div style={{
                    fontSize: 22,
                    fontWeight: 900,
                    letterSpacing: 3,
                    color: colors.text,
                    fontFamily: "monospace",
                  }}>
                    {code.claimCode ?? "N/A"}
                  </div>

                  {/* Receiver details */}
                  <div style={{ color: "#374151", fontSize: 13, marginTop: 6 }}>
                    <b>{code.receiver.fullName}</b> — {code.receiver.identificationNo}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                    {code.receiver.email ?? "No email"}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  {/* Status badge */}
                  <div style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                  }}>
                    {code.status}
                  </div>

                  {/* Expiry */}
                  {code.claimCodeExpiresAt && (
                    <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 6 }}>
                      {code.status === "ACTIVE"
                        ? `Expires: ${new Date(code.claimCodeExpiresAt).toLocaleDateString("en-SG")}`
                        : code.status === "EXPIRED"
                        ? `Expired: ${new Date(code.claimCodeExpiresAt).toLocaleDateString("en-SG")}`
                        : "Used"}
                    </div>
                  )}

                  {/* Generated date */}
                  <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>
                    Generated: {new Date(code.visitDate).toLocaleDateString("en-SG")}
                  </div>
                </div>
              </div>

              {/* Copy button for active codes */}
              {code.status === "ACTIVE" && code.claimCode && (
                <button
                  onClick={() => navigator.clipboard.writeText(code.claimCode!)}
                  style={{ marginTop: 10, fontSize: 12 }}
                >
                  Copy code
                </button>
              )}

              {/* Admin notes */}
              {code.adminNotes && (
                <div style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "#6b7280",
                  fontStyle: "italic",
                }}>
                  Note: {code.adminNotes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
