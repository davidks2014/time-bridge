/**
 * Page: /upgrade
 *
 * Purpose: Plan selection page. Shows Free, Plus, Premium plans.
 * User clicks upgrade → POST /api/stripe/checkout → redirect to Stripe.
 *
 * Design: Time Bridge design system (ivory bg, gold accent, dark brown text, Lato font)
 */
"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function UpgradePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleUpgrade(priceId: string, planKey: string) {
    setError("");
    setLoading(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to start checkout.");
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  const plans = [
    {
      key: "free",
      name: "Free",
      price: "$0",
      period: "",
      storage: "500 MB",
      description: "Get started with Time Bridge",
      features: ["Up to 500 MB storage", "Unlimited memories", "Unlimited recipients", "Legacy messages"],
      priceId: null,
      recommended: false,
    },
    {
      key: "plus",
      name: "Plus Plan",
      price: "$3.90",
      period: "/month",
      storage: "5 GB",
      description: "For individuals preserving memories",
      features: ["5 GB storage", "Everything in Free", "Priority support"],
      priceId: "price_1TRuZyE4BN2ZuVDKdGYxy5Ei",
      recommended: false,
    },
    {
      key: "premium",
      name: "Premium Plan",
      price: "$8.90",
      period: "/month",
      storage: "20 GB",
      description: "For families sharing memories",
      features: ["20 GB storage", "Everything in Plus", "Best for families"],
      priceId: "price_1TRudjE4BN2ZuVDK1cF5GyFt",
      recommended: true,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", padding: "40px 20px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <button onClick={() => router.back()} style={{ marginBottom: 24, background: "none", border: "none", color: "#B8965A", cursor: "pointer", fontSize: 14 }}>
          ← Back
        </button>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 36, fontWeight: 700, color: "#2C1810", marginBottom: 8 }}>
          Upgrade your storage
        </h1>
        <p style={{ color: "#666", marginBottom: 40, fontSize: 16 }}>
          Choose a plan that grows with your memories.
        </p>

        {error && (
          <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "12px 16px", marginBottom: 24, color: "#DC2626", fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {plans.map((plan) => (
            <div key={plan.key} style={{
              background: "#fff",
              border: plan.recommended ? "2px solid #B8965A" : "1px solid #E8D5B7",
              borderRadius: 16,
              padding: "28px 24px",
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}>
              {plan.recommended && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#B8965A", color: "#fff", fontSize: 11, fontWeight: 600, padding: "3px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>
                  Most popular
                </div>
              )}
              <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 600, color: "#B8965A", textTransform: "uppercase", letterSpacing: "0.05em" }}>{plan.storage}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#2C1810", marginBottom: 4 }}>{plan.name}</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>{plan.description}</div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 32, fontWeight: 700, color: "#2C1810" }}>{plan.price}</span>
                <span style={{ fontSize: 14, color: "#888" }}>{plan.period}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ fontSize: 13, color: "#555", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#B8965A", fontWeight: 700 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              {plan.priceId ? (
                <button
                  onClick={() => handleUpgrade(plan.priceId!, plan.key)}
                  disabled={loading === plan.key}
                  style={{
                    background: plan.recommended ? "#2C1810" : "#FAF7F2",
                    color: plan.recommended ? "#fff" : "#2C1810",
                    border: "1px solid #2C1810",
                    borderRadius: 8,
                    padding: "12px 0",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    width: "100%",
                    opacity: loading === plan.key ? 0.6 : 1,
                  }}
                >
                  {loading === plan.key ? "Redirecting..." : `Upgrade to ${plan.name}`}
                </button>
              ) : (
                <div style={{ textAlign: "center", fontSize: 13, color: "#888", padding: "12px 0" }}>Your current plan</div>
              )}
            </div>
          ))}
        </div>

        <p style={{ marginTop: 32, fontSize: 12, color: "#aaa", textAlign: "center" }}>
          Payments processed securely by Stripe. Cancel anytime from your profile.
        </p>
      </div>
    </div>
  );
}
