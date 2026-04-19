/**
 * src/app/register/page.tsx
 *
 * Purpose:
 * - Simple registration — name, email, password only
 * - Google sign-in option for one-click registration
 * - NRIC, address, ID documents are collected later when
 *   the user tries to create their first memory
 *
 * This low-friction approach gets users into the app quickly
 * and collects sensitive details only when they are needed.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();

  // Basic registration fields only
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function onSubmit() {
    setError("");
    setInfo("");

    // Validate basic fields
    if (!name.trim()) return setError("Full name is required.");
    if (!email.trim()) return setError("Email address is required.");
    if (!password.trim()) return setError("Password is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    setLoading(true);

    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("email", email.trim());
      form.append("password", password);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Registration failed. Please try again.");
        return;
      }

      setInfo("Account created. Redirecting...");

      // Auto sign in after registration
      await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      setTimeout(() => router.push("/dashboard"), 800);

    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Create your account</h1>

      <p style={{ color: "#666", marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
        Join Time Bridge and start preserving your legacy messages
        for the people you love.
      </p>

      <div style={{ marginTop: 24, display: "grid", gap: 12 }}>

        {/* ── Google sign-up — fastest option ── */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "12px 16px",
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "white",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continue with Google
        </button>

        {/* ── Divider ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{ flex: 1, height: 1, background: "#eee" }} />
          <span style={{ color: "#999", fontSize: 13 }}>or register with email</span>
          <div style={{ flex: 1, height: 1, background: "#eee" }} />
        </div>

        {/* ── Email registration ── */}
        <input
          placeholder="Full name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Email address *"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password (min 8 characters) *"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <div style={{
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            color: "#991b1b",
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {info && (
          <div style={{
            padding: "10px 14px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            color: "#166534",
            fontSize: 13,
          }}>
            {info}
          </div>
        )}

        <button onClick={onSubmit} disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>

        <button
          onClick={() => router.push("/login")}
          disabled={loading}
        >
          Already have an account? Log in
        </button>

      </div>
    </div>
  );
}
