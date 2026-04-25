"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TimeBridgeLogo from "@/components/TimeBridgeLogo";

type PendingMemory = {
  collectionId: string;
  collectionTitle: string;
  senderName: string;
  receiverName: string;
  receiverId: string;
  inviteToken: string | null;
  releasedAt: string;
};

export default function ClaimPage() {
  const router = useRouter();

  // NRIC search
  const [nric, setNric]             = useState("");
  const [searching, setSearching]   = useState(false);
  const [searched, setSearched]     = useState(false);
  const [searchError, setSearchError] = useState("");
  const [memories, setMemories]     = useState<PendingMemory[]>([]);
  const [warning, setWarning]       = useState("");

  // Claim code
  const [claimCode, setClaimCode]         = useState("");
  const [claimCodeNric, setClaimCodeNric] = useState("");
  const [redeeming, setRedeeming]         = useState(false);
  const [codeError, setCodeError]         = useState("");
  const [codeSuccess, setCodeSuccess]     = useState("");

  async function searchByNric() {
    setSearchError(""); setWarning(""); setMemories([]); setSearched(false);
    const n = nric.trim().toUpperCase();
    if (!n || n.length < 6) { setSearchError("Please enter a valid NRIC or identification number."); return; }
    setSearching(true);
    try {
      const res  = await fetch("/api/claim/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificationNo: n }),
      });
      const json = await res.json();
      if (res.status === 429) { setSearchError(json?.error ?? "Too many attempts. Please try again later."); return; }
      if (!res.ok)            { setSearchError(json?.error ?? "Search failed. Please try again."); return; }
      setMemories(json.memories ?? []);
      setSearched(true);
      if (json.warning) setWarning(json.warning);
    } catch {
      setSearchError("Network error. Please check your connection.");
    } finally {
      setSearching(false);
    }
  }

  async function redeemCode() {
    setCodeError(""); setCodeSuccess("");
    if (!claimCode.trim())     { setCodeError("Please enter your claim code."); return; }
    if (!claimCodeNric.trim()) { setCodeError("Please enter your NRIC to verify your identity."); return; }
    setRedeeming(true);
    try {
      const res  = await fetch("/api/claim/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimCode: claimCode.trim(), identificationNo: claimCodeNric.trim().toUpperCase() }),
      });
      const json = await res.json();
      if (!res.ok) { setCodeError(json?.error ?? "Invalid code. Please try again."); return; }
      if (json.linked) {
        setCodeSuccess("Memory claimed successfully. Redirecting...");
        setTimeout(() => router.push("/memory-received"), 1500);
        return;
      }
      if (json.requiresLogin) {
        setCodeSuccess("Code verified. Please sign in to complete your claim.");
        setTimeout(() => {
          router.push(`/login?callbackUrl=/claim&claimCode=${encodeURIComponent(claimCode.trim())}&nric=${encodeURIComponent(claimCodeNric.trim())}`);
        }, 1500);
      }
    } catch {
      setCodeError("Network error. Please try again.");
    } finally {
      setRedeeming(false);
    }
  }

  function handleClaim(memory: PendingMemory) {
    if (memory.inviteToken) {
      router.push(`/receiver/invite/${memory.inviteToken}/claim`);
    } else {
      router.push(`/claim/verify?receiverId=${memory.receiverId}&collectionId=${memory.collectionId}`);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--ivory)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "32px 20px 48px",
    }}>

      {/* Background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `
          radial-gradient(ellipse at 10% 40%, rgba(92,122,92,0.05) 0%, transparent 50%),
          radial-gradient(ellipse at 90% 70%, rgba(139,105,20,0.04) 0%, transparent 45%)
        `,
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 480 }}>

        {/* Logo */}
        <div className="tb-fade-in" style={{ display: "flex", justifyContent: "center", marginBottom: 32, cursor: "pointer" }}
             onClick={() => router.push("/login")}>
          <TimeBridgeLogo size="sm" variant="light" showWordmark animated />
        </div>

        {/* Title */}
        <div className="tb-fade-in tb-stagger-1" style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ marginBottom: 8 }}>Claim your memory</h2>
          <p style={{ fontSize: 14, color: "var(--earth-muted)", lineHeight: 1.7 }}>
            Someone may have left a personal message for you.<br />
            Search by NRIC or enter a claim code below.
          </p>
        </div>

        {/* ── Claim code section ── */}
        <div className="tb-card tb-fade-in tb-stagger-2" style={{
          padding: "20px 24px",
          marginBottom: 20,
          borderLeft: "4px solid var(--gold)",
        }}>
          <div className="tb-section-label" style={{ marginBottom: 12 }}>Have a claim code?</div>
          <p style={{ fontSize: 13, color: "var(--earth-muted)", marginBottom: 16, lineHeight: 1.6 }}>
            If a Time Bridge representative gave you a printed claim code during a visit, enter it here.
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            <input
              className="tb-input"
              placeholder="Claim code — e.g. TB-K3X9M2QP"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
              style={{ letterSpacing: "2px", fontWeight: 700 }}
            />
            <input
              className="tb-input"
              placeholder="Your NRIC to confirm identity"
              value={claimCodeNric}
              onChange={(e) => setClaimCodeNric(e.target.value.toUpperCase())}
            />

            {codeError && (
              <div className="tb-banner tb-banner-error" style={{ margin: 0 }}>
                <div className="tb-banner-dot tb-banner-dot-red" />
                <span>{codeError}</span>
              </div>
            )}

            {codeSuccess && (
              <div className="tb-banner tb-banner-sage" style={{ margin: 0 }}>
                <div className="tb-banner-dot tb-banner-dot-sage" />
                <span>{codeSuccess}</span>
              </div>
            )}

            <button
              className="tb-btn tb-btn-gold tb-btn-full"
              onClick={redeemCode}
              disabled={redeeming}
              style={{ fontSize: 12, letterSpacing: "1px" }}
            >
              {redeeming ? "Verifying..." : "Redeem claim code"}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="tb-divider tb-fade-in tb-stagger-3">
          <div className="tb-divider-line" />
          <span style={{ fontSize: 12, color: "var(--earth-muted)", letterSpacing: 1, whiteSpace: "nowrap" }}>
            or search by NRIC
          </span>
          <div className="tb-divider-line" />
        </div>

        {/* ── NRIC search ── */}
        <div className="tb-card tb-fade-in tb-stagger-3" style={{ padding: "20px 24px", marginTop: 20 }}>
          <div className="tb-section-label" style={{ marginBottom: 12 }}>Search for your memory</div>

          <div style={{ display: "grid", gap: 10 }}>
            <input
              className="tb-input"
              placeholder="NRIC / identification number"
              value={nric}
              onChange={(e) => setNric(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && searchByNric()}
              style={{ letterSpacing: "1px" }}
            />

            {searchError && (
              <div className="tb-banner tb-banner-error" style={{ margin: 0 }}>
                <div className="tb-banner-dot tb-banner-dot-red" />
                <span>{searchError}</span>
              </div>
            )}

            {warning && (
              <div className="tb-banner tb-banner-gold" style={{ margin: 0 }}>
                <div className="tb-banner-dot tb-banner-dot-gold" />
                <span>{warning}</span>
              </div>
            )}

            <button
              className="tb-btn tb-btn-primary tb-btn-full"
              onClick={searchByNric}
              disabled={searching}
              style={{ fontSize: 12, letterSpacing: "1px" }}
            >
              {searching ? "Searching..." : "Search for my memory"}
            </button>
          </div>

          {/* No results */}
          {searched && memories.length === 0 && (
            <div className="tb-fade-in" style={{
              marginTop: 20,
              padding: "16px",
              background: "var(--parchment)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--sand)",
            }}>
              <div style={{ fontWeight: 700, color: "var(--earth-mid)", marginBottom: 6 }}>
                No memories found for <em>{nric}</em>
              </div>
              <div style={{ fontSize: 13, color: "var(--earth-muted)", lineHeight: 1.7 }}>
                This could mean the memory has not been released yet, or a different NRIC was used. Contact our support team if you believe there should be a memory for you.
              </div>
            </div>
          )}

          {/* Results */}
          {memories.length > 0 && (
            <div className="tb-fade-in" style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--earth-mid)", marginBottom: 12 }}>
                {memories.length === 1 ? "1 memory is waiting for you" : `${memories.length} memories are waiting for you`}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {memories.map((memory) => (
                  <div key={memory.collectionId} style={{
                    padding: "16px 18px",
                    background: "var(--sage-pale)",
                    border: "1px solid var(--sage-light)",
                    borderRadius: "var(--radius-md)",
                  }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: "var(--earth)", marginBottom: 4 }}>
                      A personal message for {memory.receiverName}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--earth-muted)", marginBottom: 4 }}>
                      From <strong>{memory.senderName}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--earth-muted)", marginBottom: 14 }}>
                      Released {new Date(memory.releasedAt).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                    <div style={{
                      padding: "8px 12px",
                      background: "var(--gold-pale)",
                      border: "1px solid var(--gold-light)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                      color: "var(--earth-mid)",
                      marginBottom: 14,
                      lineHeight: 1.6,
                    }}>
                      You will be able to read this message after verifying your identity.
                    </div>
                    <button
                      className="tb-btn tb-btn-sage tb-btn-full"
                      onClick={() => handleClaim(memory)}
                      style={{ fontSize: 12, letterSpacing: "0.5px" }}
                    >
                      Verify my identity and claim →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="tb-fade-in tb-stagger-4" style={{ textAlign: "center", marginTop: 24 }}>
          <p style={{ fontSize: 12, color: "var(--earth-muted)", lineHeight: 1.6 }}>
            Already have an account?{" "}
            <a href="/login" style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "none" }}>
              Sign in
            </a>
          </p>
          <p style={{ fontSize: 11, color: "var(--earth-muted)", marginTop: 12, lineHeight: 1.6 }}>
            Your NRIC is used only to search for memories addressed to you and is not stored from this search. Time Bridge complies with PDPA.
          </p>
        </div>

      </div>
    </div>
  );
}
