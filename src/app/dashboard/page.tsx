// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { formatSingaporeDateTime } from "@/lib/sg-time";

type MismatchReceiver = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  identificationNo: string;
  linkedUserId: string | null;
};

type MeUser = {
  role: "USER" | "ADMIN";
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
};

type DashboardSummaryResponse = {
  sentCount: number;
  receivedCount: number;
  incomingCount: number;
  missedConfirmations: number;
  lastConfirmedAt: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const { status, data: session } = useSession();

  const [sentCount, setSentCount] = useState<number | null>(null);
  const [receivedCount, setReceivedCount] = useState<number | null>(null);
  const [incomingCount, setIncomingCount] = useState<number | null>(null);

  const [missedConfirmations, setMissedConfirmations] = useState<number | null>(null);
  const [lastConfirmedAt, setLastConfirmedAt] = useState<string | null>(null);
  const [confirmingProof, setConfirmingProof] = useState(false);

  const [collectionTitle, setCollectionTitle] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [itemContent, setItemContent] = useState("");

  const [releaseMode, setReleaseMode] = useState<"LATER" | "NOW">("LATER");
  const [releaseDateOnly, setReleaseDateOnly] = useState("");
  const [releaseTimeOnly, setReleaseTimeOnly] = useState("");

  const [receiverName, setReceiverName] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [receiverIdNo, setReceiverIdNo] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [mismatchReceiver, setMismatchReceiver] = useState<MismatchReceiver | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const role = (session?.user as any)?.role as MeUser["role"] | undefined;
    if (role === "ADMIN") {
      router.replace("/admin/verification");
    }
  }, [status, session, router]);

  async function guardVerification() {
    try {
      const role = (session?.user as any)?.role as MeUser["role"] | undefined;
      if (role === "ADMIN") return;

      const res = await fetch("/api/me");
      const json = await res.json();
      if (!res.ok) return;

      const u = json.user as MeUser;
      if (u?.verificationStatus && u.verificationStatus !== "APPROVED") {
        router.push("/pending-verification");
      }
    } catch {}
  }

  async function loadSummary() {
    try {
      const res = await fetch("/api/dashboard-summary");
      const json = (await res.json()) as Partial<DashboardSummaryResponse>;
      if (!res.ok) return;

      setSentCount(json.sentCount ?? 0);
      setReceivedCount(json.receivedCount ?? 0);
      setIncomingCount(json.incomingCount ?? 0);
      setMissedConfirmations(json.missedConfirmations ?? 0);
      setLastConfirmedAt(json.lastConfirmedAt ?? null);
    } catch {}
  }

  useEffect(() => {
    if (status === "authenticated") {
      guardVerification();
      loadSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function clearMismatch() {
    setMismatchReceiver(null);
  }

  function resetReleaseInputs() {
    setReleaseDateOnly("");
    setReleaseTimeOnly("");
  }

  function buildReleaseDateTime(): string | null {
    const datePart = releaseDateOnly.trim();
    const timePart = releaseTimeOnly.trim();

    if (!datePart || !timePart) return null;

    // This creates a stable ISO-like local datetime string:
    // YYYY-MM-DDTHH:mm
    return `${datePart}T${timePart}`;
  }

  async function confirmProofOfLife() {
    setError("");
    setInfo("");
    setConfirmingProof(true);

    try {
      const res = await fetch("/api/proof-of-life/confirm", {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed to confirm proof-of-life.");
        return;
      }

      setInfo("Proof-of-life confirmed successfully.");
      await loadSummary();
    } catch {
      setError("Network error.");
    } finally {
      setConfirmingProof(false);
    }
  }

  async function createMemory() {
    setError("");
    setInfo("");
    clearMismatch();

    if (!collectionTitle.trim()) return setError("Memory title is required.");
    if (!itemTitle.trim()) return setError("Message title is required.");
    if (!itemContent.trim()) return setError("Message content is required.");

    if (!receiverIdNo.trim()) return setError("Receiver identification number is required.");
    if (!receiverName.trim()) return setError("Receiver name is required.");
    if (!receiverEmail.trim()) return setError("Receiver email is required.");
    if (!receiverPhone.trim()) return setError("Receiver phone is required.");
    if (!receiverAddress.trim()) return setError("Receiver address is required.");

    const normalizedReleaseDateTime = buildReleaseDateTime();

    if (releaseMode === "NOW" && !normalizedReleaseDateTime) {
      return setError("Please choose a release date and time, or select Set Date Later.");
    }

    setLoading(true);

    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionTitle,
          itemTitle,
          itemContent,
          releaseDate: releaseMode === "NOW" ? normalizedReleaseDateTime : null,
          newReceiver: {
            fullName: receiverName.trim(),
            email: receiverEmail.trim(),
            phone: receiverPhone.trim(),
            address: receiverAddress.trim(),
            identificationNo: receiverIdNo.trim(),
          },
        }),
      });

      const json = await res.json();

      if (res.status === 409 && json?.error === "RECEIVER_EMAIL_MISMATCH") {
        setMismatchReceiver(json.receiver as MismatchReceiver);
        setError("");
        setInfo("");
        return;
      }

      if (!res.ok) {
        setError(json?.error ?? "Failed to create memory.");
        return;
      }

      setInfo("Memory created successfully. Redirecting to Memory Sent...");

      setCollectionTitle("");
      setItemTitle("");
      setItemContent("");
      setReleaseMode("LATER");
      resetReleaseInputs();

      setReceiverName("");
      setReceiverEmail("");
      setReceiverPhone("");
      setReceiverAddress("");
      setReceiverIdNo("");

      await loadSummary();

      setTimeout(() => {
        router.push("/memory-sent");
      }, 600);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  function useExistingEmail() {
    if (!mismatchReceiver) return;
    setReceiverEmail(mismatchReceiver.email);
    setInfo("Email updated to the existing receiver email. Click Create Memory again.");
  }

  function cancelMismatch() {
    clearMismatch();
    setInfo("");
  }

  if (status === "loading") {
    return <div style={{ padding: 20 }}>Checking session...</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800 }}>Dashboard</h1>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close Create Memory" : "+ Create Memory"}
        </button>

        <button onClick={() => router.push("/receivers")}>Receivers</button>

        <button style={{ marginLeft: "auto" }} onClick={() => signOut({ callbackUrl: "/login" })}>
          Logout
        </button>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <div
          style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, cursor: "pointer" }}
          onClick={() => router.push("/memory-sent")}
        >
          <div style={{ fontWeight: 900, fontSize: 16 }}>Memory Sent</div>
          <div style={{ marginTop: 6, color: "#666" }}>
            Count: <b>{sentCount === null ? "..." : sentCount}</b>
          </div>
        </div>

        <div
          style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, cursor: "pointer" }}
          onClick={() => router.push("/memory-received")}
        >
          <div style={{ fontWeight: 900, fontSize: 16 }}>Memory Received</div>
          <div style={{ marginTop: 6, color: "#666" }}>
            Count: <b>{receivedCount === null ? "..." : receivedCount}</b>
          </div>
        </div>

        <div
          style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, cursor: "pointer" }}
          onClick={() => router.push("/incoming-memory")}
        >
          <div style={{ fontWeight: 900, fontSize: 16 }}>Incoming Memory</div>
          <div style={{ marginTop: 6, color: "#666" }}>
            Count: <b>{incomingCount === null ? "..." : incomingCount}</b>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Proof-of-Life</div>

          <div style={{ marginTop: 6, color: "#666" }}>
            Last confirmed:{" "}
            <b>
              {lastConfirmedAt
                ? `${formatSingaporeDateTime(lastConfirmedAt)} (SGT)`
                : "Never confirmed yet"}
            </b>
          </div>

          <div style={{ marginTop: 6, color: "#666" }}>
            Missed confirmations: <b>{missedConfirmations === null ? "..." : missedConfirmations}</b>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
            This affects memories that use proof-of-life release rule when no release date is set.
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={confirmProofOfLife} disabled={confirmingProof}>
              {confirmingProof ? "Confirming..." : "I'm Alive / Confirm Proof-of-Life"}
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Create Memory</div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Memory Card</div>
            <input
              placeholder="Memory title *"
              value={collectionTitle}
              onChange={(e) => setCollectionTitle(e.target.value)}
            />

            <div style={{ fontWeight: 800, marginTop: 8 }}>Message (TEXT)</div>
            <input
              placeholder="Message title *"
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
            />
            <textarea
              placeholder="Message content *"
              value={itemContent}
              onChange={(e) => setItemContent(e.target.value)}
              rows={4}
            />

            <div style={{ fontWeight: 800, marginTop: 8 }}>Release Time (Singapore Time)</div>

            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="radio"
                  name="releaseMode"
                  checked={releaseMode === "LATER"}
                  onChange={() => {
                    setReleaseMode("LATER");
                    resetReleaseInputs();
                    setError("");
                  }}
                />
                Set Date Later
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="radio"
                  name="releaseMode"
                  checked={releaseMode === "NOW"}
                  onChange={() => {
                    setReleaseMode("NOW");
                    setError("");
                  }}
                />
                Set Release Date Now
              </label>
            </div>

            {releaseMode === "NOW" && (
              <div style={{ display: "grid", gap: 10 }}>
                <input
                  type="date"
                  value={releaseDateOnly}
                  onChange={(e) => {
                    setReleaseDateOnly(e.target.value);
                    setError("");
                  }}
                />

                <input
                  type="time"
                  value={releaseTimeOnly}
                  step={60}
                  onChange={(e) => {
                    setReleaseTimeOnly(e.target.value);
                    setError("");
                  }}
                />
              </div>
            )}

            <div style={{ color: "#666", fontSize: 12 }}>
              {releaseMode === "LATER"
                ? "No release date will be set now. This memory item can later use proof-of-life release until you add a fixed release date."
                : "Choose the Singapore date and time for release."}
            </div>

            <div style={{ fontWeight: 800, marginTop: 8 }}>Receiver (mandatory)</div>

            <input
              placeholder="Receiver identification number *"
              value={receiverIdNo}
              onChange={(e) => {
                setReceiverIdNo(e.target.value);
                clearMismatch();
              }}
            />

            <input
              placeholder="Receiver full name *"
              value={receiverName}
              onChange={(e) => {
                setReceiverName(e.target.value);
                clearMismatch();
              }}
            />

            <input
              placeholder="Receiver email *"
              value={receiverEmail}
              onChange={(e) => {
                setReceiverEmail(e.target.value);
                clearMismatch();
              }}
            />

            <input
              placeholder="Receiver phone *"
              value={receiverPhone}
              onChange={(e) => {
                setReceiverPhone(e.target.value);
                clearMismatch();
              }}
            />

            <input
              placeholder="Receiver address *"
              value={receiverAddress}
              onChange={(e) => {
                setReceiverAddress(e.target.value);
                clearMismatch();
              }}
            />

            {mismatchReceiver && (
              <div
                style={{
                  marginTop: 10,
                  border: "1px solid #f2c94c",
                  background: "#fff8db",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 900 }}>Receiver email mismatch</div>

                <div style={{ marginTop: 6 }}>
                  Identification number matched an existing receiver:
                </div>

                <div style={{ marginTop: 6 }}>
                  Name: <b>{mismatchReceiver.fullName}</b>
                </div>

                <div style={{ marginTop: 6 }}>
                  Existing email in system: <b>{mismatchReceiver.email}</b>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                  <button type="button" onClick={useExistingEmail}>
                    Use existing email
                  </button>
                  <button type="button" onClick={cancelMismatch}>
                    Cancel
                  </button>
                </div>

                <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
                  Tip: Click “Use existing email”, then click “Create Memory” again.
                </div>
              </div>
            )}

            {error && <div style={{ color: "red" }}>{error}</div>}
            {info && <div style={{ color: "green" }}>{info}</div>}

            <button onClick={createMemory} disabled={loading}>
              {loading ? "Creating..." : "Create Memory"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}