"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import TimeBridgeLogo from "@/components/TimeBridgeLogo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleGoogleLogin() {
    const isMobile = Capacitor.isNativePlatform();

    if (isMobile) {
      setLoading(true);
      setError("");
      try {
        const { nativeGoogleSignIn } = await import("@/lib/nativeGoogleAuth");
        const googleUser = await nativeGoogleSignIn();
        if (!googleUser?.email) throw new Error("No email returned");
        const res = await fetch("/api/auth/native-google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: googleUser.email,
            name: googleUser.name,
          }),
        });
        if (!res.ok) throw new Error("Sign in failed");
        router.push("/dashboard");
      } catch (err: any) {
        setError(err?.message ?? "Google sign in failed. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    signIn("google", { callbackUrl: "/dashboard" });
  }

  async function login() {
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (!res?.ok) {
        setError("Incorrect email or password. Please try again.");
        return;
      }
      setTimeout(() => {
        fetch("/api/auth/record-device", { method: "POST" }).catch(() => {});
      }, 1000);
      router.push(callbackUrl);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--ivory)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 20px",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Background texture */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `
          radial-gradient(ellipse at 15% 50%, rgba(139,105,20,0.05) 0%, transparent 55%),
          radial-gradient(ellipse at 85% 20%, rgba(92,122,92,0.05) 0%, transparent 45%),
          radial-gradient(ellipse at 50% 90%, rgba(139,105,20,0.03) 0%, transparent 40%)
        `,
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div className="tb-fade-in" style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
          <TimeBridgeLogo size="md" variant="light" showWordmark animated />
        </div>

        {/* Card */}
        <div className="tb-card tb-fade-in tb-stagger-2" style={{ padding: "36px 32px" }}>

          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: 24,
            fontWeight: 400,
            color: "var(--earth)",
            textAlign: "center",
            marginBottom: 6,
          }}>
            Welcome back
          </h3>
          <p style={{
            fontSize: 13,
            color: "var(--earth-muted)",
            textAlign: "center",
            marginBottom: 28,
          }}>
            Your memories are safely waiting
          </p>

          {error && (
            <div className="tb-banner tb-banner-error">
              <div className="tb-banner-dot tb-banner-dot-red" />
              <span>{error}</span>
            </div>
          )}

          <div className="tb-field">
            <label className="tb-label">Email address</label>
            <input
              className="tb-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              autoComplete="email"
            />
          </div>

          <div className="tb-field">
            <label className="tb-label">Password</label>
            <input
              className="tb-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              autoComplete="current-password"
            />
          </div>

          <button
            className="tb-btn tb-btn-primary tb-btn-full"
            onClick={login}
            disabled={loading}
            style={{ marginTop: 8, fontSize: 13, letterSpacing: "1.5px" }}
          >
            {loading ? "Signing in..." : "Continue"}
          </button>

          <div className="tb-divider" style={{ margin: "20px 0" }}>
            <div className="tb-divider-line" />
            <span style={{ fontSize: 12, color: "var(--earth-muted)", letterSpacing: 1 }}>or</span>
            <div className="tb-divider-line" />
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            style={{
              width: "100%",
              background: "var(--ivory)",
              border: "1px solid var(--border-dark)",
              borderRadius: "var(--radius-md)",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--earth)",
              transition: "all var(--transition)",
              minHeight: 44,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--cream)";
              e.currentTarget.style.borderColor = "var(--gold-light)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--ivory)";
              e.currentTarget.style.borderColor = "var(--border-dark)";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

        </div>

        {/* Footer links */}
        <div className="tb-fade-in tb-stagger-3" style={{ textAlign: "center", marginTop: 20 }}>
          <p style={{ fontSize: 13, color: "var(--earth-muted)" }}>
            New to Time Bridge?{" "}
            <a href="/register" style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "none" }}>
              Create an account
            </a>
          </p>
          <p style={{ fontSize: 12, color: "var(--earth-muted)", marginTop: 8 }}>
            Received a memory?{" "}
            <a href="/claim" style={{ color: "var(--sage)", textDecoration: "none", fontWeight: 700 }}>
              Claim it here
            </a>
          </p>
          <p style={{ fontSize: 11, color: "var(--earth-muted)", marginTop: 16, lineHeight: 1.6 }}>
            By continuing, you agree to our{" "}
            <a href="/terms" style={{ color: "var(--earth-muted)", textDecoration: "underline" }}>Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" style={{ color: "var(--earth-muted)", textDecoration: "underline" }}>Privacy Policy</a>
          </p>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--ivory)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <TimeBridgeLogo size="md" variant="light" showWordmark animated />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
