/**
 * src/app/admin/page.tsx
 *
 * Purpose:
 * - Admin home dashboard — overview of all key stats
 * - Links to all admin sub-sections
 * - First page admin sees after login
 */

"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

type AdminStats = {
  totalUsers: number;
  pendingVerifications: number;
  totalMemories: number;
  releasedMemories: number;
  totalReceivers: number;
  unclaimedReceivers: number;
  deliveryFailed: number;
  totalVisitLogs: number;
};

export default function AdminHomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      if (role && role !== "ADMIN") router.replace("/dashboard");
      else loadStats();
    }
  }, [status, role]);

  async function loadStats() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to load stats.");
        return;
      }
      setStats(json.stats);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || loading) {
    return <div style={{ padding: 20 }}>Loading admin dashboard...</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>

      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Admin Dashboard</h1>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
            Logged in as {session?.user?.email}
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })}>Logout</button>
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

      {/* Stats grid */}
      {stats && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}>
          <StatCard label="Total Users" value={stats.totalUsers} color="#1D9E75" />
          <StatCard label="Pending Verifications" value={stats.pendingVerifications} color="#d97706" alert={stats.pendingVerifications > 0} />
          <StatCard label="Total Memories" value={stats.totalMemories} color="#3b82f6" />
          <StatCard label="Released Memories" value={stats.releasedMemories} color="#8b5cf6" />
          <StatCard label="Total Receivers" value={stats.totalReceivers} color="#06b6d4" />
          <StatCard label="Unclaimed Receivers" value={stats.unclaimedReceivers} color="#f59e0b" alert={stats.unclaimedReceivers > 0} />
          <StatCard label="Failed Deliveries" value={stats.deliveryFailed} color="#ef4444" alert={stats.deliveryFailed > 0} />
          <StatCard label="Visit Logs" value={stats.totalVisitLogs} color="#6b7280" />
        </div>
      )}

      {/* Navigation cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
      }}>
        <NavCard
          title="Verification Queue"
          description="Review and approve pending identity verifications"
          badge={stats?.pendingVerifications}
          onClick={() => router.push("/admin/verification")}
          urgent={!!stats?.pendingVerifications && stats.pendingVerifications > 0}
        />
        <NavCard
          title="Receiver Management"
          description="View all receivers, delivery status and claim status"
          onClick={() => router.push("/admin/receivers")}
        />
        <NavCard
          title="Claim Codes"
          description="Generate claim codes for physical visit delivery"
          onClick={() => router.push("/admin/claim-codes")}
        />
        <NavCard
          title="Visit Logs"
          description="Record and view physical visits to receivers"
          onClick={() => router.push("/admin/visits")}
        />
        <NavCard
          title="Memory Oversight"
          description="View all memories and their release status"
          onClick={() => router.push("/admin/memories")}
        />
        <NavCard
          title="Audit Log"
          description="View all system actions and security events"
          onClick={() => router.push("/admin/audit")}
        />
        <NavCard
          title="User Management"
          description="List all users, change roles, force verify"
          onClick={() => router.push("/admin/users")}
        />
        <NavCard
          title="Delivery Attempts"
          description="View all delivery attempts per receiver"
          onClick={() => router.push("/admin/deliveries")}
        />
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  alert = false,
}: {
  label: string;
  value: number;
  color: string;
  alert?: boolean;
}) {
  return (
    <div style={{
      padding: 16,
      borderRadius: 12,
      border: `1px solid ${alert ? "#fecaca" : "#e5e7eb"}`,
      background: alert ? "#fef2f2" : "white",
    }}>
      <div style={{ fontSize: 28, fontWeight: 900, color }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: alert ? "#991b1b" : "#6b7280", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

// ─── Nav Card ─────────────────────────────────────────────────────────────────

function NavCard({
  title,
  description,
  badge,
  onClick,
  urgent = false,
}: {
  title: string;
  description: string;
  badge?: number;
  onClick: () => void;
  urgent?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 16,
        borderRadius: 12,
        border: `1px solid ${urgent ? "#fecaca" : "#e5e7eb"}`,
        background: urgent ? "#fef2f2" : "white",
        cursor: "pointer",
        transition: "box-shadow 0.1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: urgent ? "#991b1b" : "#111" }}>
          {title}
        </div>
        {!!badge && badge > 0 && (
          <div style={{
            background: "#ef4444",
            color: "white",
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            minWidth: 20,
            textAlign: "center",
          }}>
            {badge}
          </div>
        )}
      </div>
      <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
        {description}
      </div>
    </div>
  );
}
