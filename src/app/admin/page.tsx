"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type AdminStats = {
  totalUsers: number;
  pendingVerifications: number;
  totalMemories: number;
  releasedMemories: number;
  totalReceivers: number;
  unclaimedReceivers: number;
  deliveryFailed: number;
  totalVisitLogs: number;
  freePlanUsers: number;
  plusPlanUsers: number;
  premiumPlanUsers: number;
  mrr: number;
  totalStorageUsedMB: number;
  r2CostEstimate: number;
};

const NAV_ITEMS = [
  { href: "/admin/verification", label: "Verification Queue",   icon: "🪪", desc: "Review pending identity documents"     },
  { href: "/admin/receivers",    label: "Receivers",             icon: "👥", desc: "View delivery and claim status"        },
  { href: "/admin/claim-codes",  label: "Claim Codes",           icon: "🔑", desc: "Active, used and expired codes"        },
  { href: "/admin/visits",       label: "Visit Logs",            icon: "📋", desc: "Record and view physical visits"       },
  { href: "/admin/memories",     label: "Memory Oversight",      icon: "💌", desc: "All memories across all users"         },
  { href: "/admin/audit",        label: "Audit Log",             icon: "📜", desc: "All system actions and events"         },
  { href: "/admin/deliveries",   label: "Delivery Attempts",     icon: "📬", desc: "Channel attempts per receiver"         },
  { href: "/admin/users",        label: "User Management",       icon: "⚙️", desc: "Force approve, reject, reset proof"   },
];

export default function AdminHomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats]   = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

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
    try {
      const res  = await fetch("/api/admin/stats");
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Failed to load stats."); return; }
      setStats(json.stats);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || loading) {
    return <TimeBridgeLoading message="Loading admin dashboard..." />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1C1814" }}>

      {/* Admin navbar */}
      <div style={{
        background: "#2C2416",
        borderBottom: "1px solid #3D3020",
        padding: "0 24px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32,
            background: "var(--gold)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}>
            🛡️
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "#F0E8D8", letterSpacing: "2px" }}>
              TIME BRIDGE
            </div>
            <div style={{ fontSize: 9, color: "var(--gold-light)", letterSpacing: "2px", textTransform: "uppercase" }}>
              Admin Console
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#9B8060" }}>{session?.user?.email}</span>
          <span className="tb-admin-badge">ADMIN</span>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              background: "transparent",
              border: "1px solid #3D3020",
              color: "#9B8060",
              borderRadius: "var(--radius-sm)",
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              letterSpacing: "0.5px",
              transition: "all var(--transition)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold-light)"; e.currentTarget.style.color = "var(--gold-light)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#3D3020"; e.currentTarget.style.color = "#9B8060"; }}
          >
            User View
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              background: "transparent",
              border: "1px solid #3D3020",
              color: "#9B8060",
              borderRadius: "var(--radius-sm)",
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              letterSpacing: "0.5px",
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px 48px" }}>

        {/* Header */}
        <div className="tb-fade-in" style={{ marginBottom: 32 }}>
          <h1 style={{ color: "#F0E8D8", fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 300, letterSpacing: "1px" }}>
            Admin Dashboard
          </h1>
          <p style={{ color: "#9B8060", fontSize: 14, marginTop: 6 }}>
            Time Bridge — {new Date().toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {error && (
          <div className="tb-banner tb-banner-error tb-fade-in" style={{ marginBottom: 24 }}>
            <div className="tb-banner-dot tb-banner-dot-red" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats grid */}
        {stats && (
          <div className="tb-fade-in tb-stagger-1" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 32,
          }}>
            {[
              { label: "Total Users",          value: stats.totalUsers,           alert: false,                              color: "var(--gold-light)" },
              { label: "Pending Verification", value: stats.pendingVerifications, alert: stats.pendingVerifications > 0,     color: "#F5C842" },
              { label: "Total Memories",       value: stats.totalMemories,        alert: false,                              color: "var(--gold-light)" },
              { label: "Released Memories",    value: stats.releasedMemories,     alert: false,                              color: "#7CA87C" },
              { label: "Total Receivers",      value: stats.totalReceivers,       alert: false,                              color: "var(--gold-light)" },
              { label: "Unclaimed Receivers",  value: stats.unclaimedReceivers,   alert: stats.unclaimedReceivers > 0,       color: "#F5C842" },
              { label: "Failed Deliveries",    value: stats.deliveryFailed,       alert: stats.deliveryFailed > 0,           color: stats.deliveryFailed > 0 ? "#F87171" : "var(--gold-light)" },
              { label: "Visit Logs",           value: stats.totalVisitLogs,       alert: false,                              color: "var(--gold-light)" },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  background: stat.alert ? "rgba(239,68,68,0.08)" : "#2C2416",
                  border: `1px solid ${stat.alert ? "rgba(239,68,68,0.3)" : "#3D3020"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "18px",
                  transition: "all var(--transition)",
                  cursor: "default",
                }}
              >
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 40,
                  fontWeight: 300,
                  color: stat.color,
                  lineHeight: 1,
                }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 11, color: "#9B8060", marginTop: 6, letterSpacing: "0.5px" }}>
                  {stat.label}
                </div>
                {stat.alert && stat.value > 0 && (
                  <div style={{
                    marginTop: 6,
                    width: 8, height: 8,
                    borderRadius: "50%",
                    background: "#F87171",
                    animation: "tb-pulse-dot 1.5s ease-in-out infinite",
                  }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Storage & Revenue */}
        {stats && (
          <div className="tb-fade-in" style={{ marginBottom: 32 }}>
            <div className="tb-section-label" style={{ color: "var(--gold-light)", marginBottom: 16 }}>
              Storage & Revenue
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}>
              {[
                { label: "Free Plan Users",       value: String(stats.freePlanUsers),                             color: "var(--gold-light)" },
                { label: "Plus Plan Users",        value: String(stats.plusPlanUsers),                             color: "var(--gold-light)" },
                { label: "Premium Plan Users",     value: String(stats.premiumPlanUsers),                          color: "var(--gold-light)" },
                { label: "MRR (SGD)",              value: `$${stats.mrr.toFixed(2)}`,                              color: "#7CA87C" },
                { label: "Total Storage Used",     value: `${(stats.totalStorageUsedMB / 1024).toFixed(2)} GB`,   color: "var(--gold-light)" },
                { label: "R2 Cost Est. (USD/mo)",  value: `$${stats.r2CostEstimate.toFixed(2)}`,                  color: "#9B8060" },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    background: "#2C2416",
                    border: "1px solid #3D3020",
                    borderRadius: "var(--radius-md)",
                    padding: "18px",
                  }}
                >
                  <div style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 40,
                    fontWeight: 300,
                    color: stat.color,
                    lineHeight: 1,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 11, color: "#9B8060", marginTop: 6, letterSpacing: "0.5px" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation cards */}
        <div className="tb-section-label" style={{ color: "var(--gold-light)", marginBottom: 16 }}>
          Admin sections
        </div>

        <div className="tb-fade-in tb-stagger-2" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}>
          {NAV_ITEMS.map((item) => {
            const isPending = item.href === "/admin/verification" && (stats?.pendingVerifications ?? 0) > 0;
            const isFailed  = item.href === "/admin/deliveries"   && (stats?.deliveryFailed ?? 0) > 0;
            const hasAlert  = isPending || isFailed;

            return (
              <div
                key={item.href}
                onClick={() => router.push(item.href)}
                style={{
                  background: hasAlert ? "rgba(239,68,68,0.06)" : "#2C2416",
                  border: `1px solid ${hasAlert ? "rgba(239,68,68,0.25)" : "#3D3020"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "18px",
                  cursor: "pointer",
                  transition: "all var(--transition)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = hasAlert ? "rgba(239,68,68,0.1)" : "#3D3020";
                  e.currentTarget.style.borderColor = hasAlert ? "rgba(239,68,68,0.4)" : "var(--gold-light)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = hasAlert ? "rgba(239,68,68,0.06)" : "#2C2416";
                  e.currentTarget.style.borderColor = hasAlert ? "rgba(239,68,68,0.25)" : "#3D3020";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  {isPending && (
                    <span style={{
                      background: "#DC2626",
                      color: "white",
                      borderRadius: "999px",
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                    }}>
                      {stats?.pendingVerifications}
                    </span>
                  )}
                  {isFailed && !isPending && (
                    <span style={{
                      background: "#DC2626",
                      color: "white",
                      borderRadius: "999px",
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                    }}>
                      {stats?.deliveryFailed}
                    </span>
                  )}
                </div>
                <div style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: hasAlert ? "#F87171" : "#F0E8D8",
                  marginTop: 12,
                  marginBottom: 4,
                  letterSpacing: "0.3px",
                }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 12, color: "#9B8060", lineHeight: 1.5 }}>
                  {item.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Refresh */}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button
            onClick={loadStats}
            style={{
              background: "transparent",
              border: "1px solid #3D3020",
              color: "#9B8060",
              borderRadius: "var(--radius-sm)",
              padding: "8px 20px",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              letterSpacing: "1px",
              transition: "all var(--transition)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold-light)"; e.currentTarget.style.color = "var(--gold-light)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#3D3020"; e.currentTarget.style.color = "#9B8060"; }}
          >
            ↻ Refresh stats
          </button>
        </div>

      </div>
    </div>
  );
}
