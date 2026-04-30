/**
 * Page: /upgrade/success
 *
 * Purpose: Shown after successful Stripe Checkout.
 * Displays confirmation and redirects user to dashboard.
 */
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UpgradeSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push("/dashboard"), 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 32, fontWeight: 700, color: "#2C1810", marginBottom: 12 }}>
          You are all set
        </h1>
        <p style={{ color: "#666", fontSize: 16, marginBottom: 24 }}>
          Your storage has been upgraded. You will be redirected to your dashboard shortly.
        </p>
        <button onClick={() => router.push("/dashboard")} style={{ background: "#2C1810", color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Go to dashboard
        </button>
      </div>
    </div>
  );
}
