"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Page: /register
 *
 * Purpose:
 * - Register new user (email+password)
 * - Collect mandatory profile fields
 * - Upload verification images (front required, back optional)
 *
 * Calls:
 * - POST /api/auth/register (multipart/form-data)
 */
export default function RegisterPage() {
  const router = useRouter();

  // Text fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [identificationNo, setIdentificationNo] = useState("");
  const [address, setAddress] = useState("");

  // Files
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function onSubmit() {
    setError("");
    setInfo("");

    // Basic validation
    if (!email.trim() || !password.trim() || !name.trim()) {
      return setError("Email, password and name are required.");
    }
    if (!phoneNumber.trim() || !identificationNo.trim() || !address.trim()) {
      return setError("Phone number, identification no, and address are required.");
    }
    if (!idFront) {
      return setError("Please upload verification image (front).");
    }

    setLoading(true);

    try {
      const form = new FormData();
      form.append("email", email.trim());
      form.append("password", password);
      form.append("name", name.trim());
      form.append("phoneNumber", phoneNumber.trim());
      form.append("identificationNo", identificationNo.trim());
      form.append("address", address.trim());

      form.append("idFront", idFront);
      if (idBack) form.append("idBack", idBack);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Register failed.");
        return;
      }

      setInfo("Registered. Awaiting admin verification. Redirecting to login...");

      setTimeout(() => {
        router.push("/login");
      }, 800);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Register</h1>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <input
          placeholder="Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Email *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password *"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          placeholder="Phone Number *"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        <input
          placeholder="Identification No *"
          value={identificationNo}
          onChange={(e) => setIdentificationNo(e.target.value)}
        />

        <input
          placeholder="Address *"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <div style={{ marginTop: 8, fontWeight: 900 }}>Verification Documents</div>

        <div style={{ color: "#666", fontSize: 13 }}>
          Upload NRIC / driving license image. Front is required. (JPG/PNG/WebP, max 5MB)
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setIdFront(e.target.files?.[0] ?? null)}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setIdBack(e.target.files?.[0] ?? null)}
        />

        {error && <div style={{ color: "red" }}>{error}</div>}
        {info && <div style={{ color: "green" }}>{info}</div>}

        <button onClick={onSubmit} disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>

        <button onClick={() => router.push("/login")} disabled={loading}>
          Back to Login
        </button>
      </div>
    </div>
  );
}