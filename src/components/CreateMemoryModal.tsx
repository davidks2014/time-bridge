"use client";

import { useState, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Attachment = {
  type: "IMAGE" | "VIDEO";
  mediaUrl: string;
  mediaPublicId: string;
  mediaFileName: string | null;
  mediaMimeType: string | null;
};

type Receiver = {
  idNo: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  receiverType: "ADULT" | "CHILD" | "UNKNOWN";
  guardianName: string;
  guardianNric: string;
  guardianEmail: string;
  guardianPhone: string;
  guardianAddress: string;
};

const emptyReceiver = (): Receiver => ({
  idNo: "", name: "", email: "", phone: "", address: "",
  receiverType: "ADULT",
  guardianName: "", guardianNric: "", guardianEmail: "",
  guardianPhone: "", guardianAddress: "",
});

function getAgeFromNric(nric: string): number | null {
  if (!nric || nric.length < 7) return null;
  const prefix = nric[0].toUpperCase();
  const yearDigits = nric.slice(1, 3);
  const year = parseInt(yearDigits, 10);
  if (isNaN(year)) return null;
  const fullYear = prefix === "T" || prefix === "G" || prefix === "M"
    ? 2000 + year : 1900 + year;
  return new Date().getFullYear() - fullYear;
}

// ── Step indicators ───────────────────────────────────────────────────────────

function Steps({ current }: { current: number }) {
  const steps = ["Memory", "Receivers", "Release"];
  return (
    <div className="tb-steps">
      {steps.map((label, i) => {
        const idx = i + 1;
        const isDone   = idx < current;
        const isActive = idx === current;
        return (
          <div key={i} className="tb-step" style={{ flex: i < steps.length - 1 ? 1 : "unset" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className={`tb-step-circle ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}>
                {isDone ? "✓" : idx}
              </div>
              <span className={`tb-step-label ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`tb-step-line ${isDone ? "done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function CreateMemoryModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1 — Memory content
  const [collectionTitle, setCollectionTitle] = useState("");
  const [itemTitle, setItemTitle]             = useState("");
  const [itemContent, setItemContent]         = useState("");
  const [attachments, setAttachments]         = useState<Attachment[]>([]);
  const [uploading, setUploading]             = useState(false);
  const [uploadProgress, setUploadProgress]   = useState<number | null>(null);
  const [uploadFileName, setUploadFileName]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 2 — Receivers
  const [receivers, setReceivers] = useState<Receiver[]>([emptyReceiver()]);

  // Step 3 — Release
  const [releaseMode, setReleaseMode] = useState<"PROOF" | "DATE">("PROOF");
  const [releaseDate, setReleaseDate] = useState("");
  const [releaseTime, setReleaseTime] = useState("08:00");

  function updateReceiver(idx: number, field: string, value: string) {
    setReceivers((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function addReceiver() {
    setReceivers((prev) => [...prev, emptyReceiver()]);
  }

  function removeReceiver(idx: number) {
    if (receivers.length === 1) return;
    setReceivers((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── File upload ──

  // Upload file to B2 via presigned PUT using XHR so we get progress events.
  // fetch() does not expose upload progress for large files.
  function putToB2WithProgress(
    uploadUrl: string,
    file: File,
    onProgress: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve();
        } else {
          reject(new Error(`B2 upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
      xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];
    if (!allowed.includes(file.type)) {
      setError("Only JPG, PNG, WebP images and MP4/MOV videos are allowed.");
      return;
    }
    const isVideo = file.type.startsWith("video/");
    const maxBytes = isVideo ? 200 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxLabel = isVideo ? "200MB" : "10MB";
    if (file.size > maxBytes) {
      setError(`File too large. Maximum ${maxLabel}.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadFileName(file.name);
    setError("");

    try {
      const itemType: "IMAGE" | "VIDEO" = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";

      // Step 1: Get presigned B2 upload URL from server
      const signRes = await fetch("/api/media/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, fileName: file.name, contentType: file.type }),
      });
      const signJson = await signRes.json();
      if (!signRes.ok) throw new Error(signJson?.error ?? "Failed to get upload URL");

      // Step 2: PUT file directly to B2 with XHR for progress tracking
      await putToB2WithProgress(signJson.uploadUrl, file, setUploadProgress);

      // Step 3: Report file size to server for storage tracking (non-blocking)
      const sizeMB = file.size / (1024 * 1024);
      fetch("/api/media/confirm-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sizeMB }),
      }).catch(() => {});

      setAttachments((prev) => [...prev, {
        type: itemType,
        mediaUrl: signJson.cdnUrl,
        mediaPublicId: signJson.key,
        mediaFileName: file.name,
        mediaMimeType: file.type,
      }]);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      setUploadFileName("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Validation ──
  function validateStep1() {
    if (!collectionTitle.trim()) { setError("Memory title is required."); return false; }
    if (!itemTitle.trim())       { setError("Message title is required."); return false; }
    if (!itemContent.trim())     { setError("Message content is required."); return false; }
    return true;
  }

  function validateStep2() {
    for (let i = 0; i < receivers.length; i++) {
      const r = receivers[i];
      const label = receivers.length > 1 ? `Receiver ${i + 1}` : "Receiver";
      if (!r.idNo.trim())    { setError(`${label} NRIC is required.`);    return false; }
      if (!r.name.trim())    { setError(`${label} name is required.`);    return false; }
      if (!r.address.trim()) { setError(`${label} address is required.`); return false; }
      if (r.receiverType !== "ADULT") {
        if (!r.guardianName.trim())    { setError(`${label} guardian name is required.`);    return false; }
        if (!r.guardianEmail.trim())   { setError(`${label} guardian email is required.`);   return false; }
        if (!r.guardianPhone.trim())   { setError(`${label} guardian phone is required.`);   return false; }
        if (!r.guardianAddress.trim()) { setError(`${label} guardian address is required.`); return false; }
      }
    }
    return true;
  }

  function validateStep3() {
    if (releaseMode === "DATE") {
      if (!releaseDate) { setError("Please select a release date."); return false; }
      const dt = new Date(`${releaseDate}T${releaseTime}:00+08:00`);
      if (dt <= new Date()) { setError("Release date must be in the future."); return false; }
    }
    return true;
  }

  function goNext() {
    setError("");
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => s + 1);
  }

  function goBack() {
    setError("");
    setStep((s) => s - 1);
  }

  // ── Submit ──
  async function submit() {
    setError("");
    if (!validateStep3()) return;

    setLoading(true);
    try {
      let finalReleaseDate: string | null = null;
      if (releaseMode === "DATE") {
        finalReleaseDate = new Date(`${releaseDate}T${releaseTime}:00+08:00`).toISOString();
      }

      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionTitle: collectionTitle.trim(),
          itemTitle: itemTitle.trim(),
          itemContent: itemContent.trim(),
          attachments,
          releaseDate: finalReleaseDate,
          receivers: receivers.map((r) => ({
            fullName: r.name.trim(),
            email: r.email.trim() || null,
            phone: r.phone.trim() || null,
            address: r.address.trim(),
            identificationNo: r.idNo.trim().toUpperCase(),
            receiverType: r.receiverType,
            guardianName: r.guardianName.trim() || null,
            guardianNric: r.guardianNric.trim() || null,
            guardianEmail: r.guardianEmail.trim() || null,
            guardianPhone: r.guardianPhone.trim() || null,
            guardianAddress: r.guardianAddress.trim() || null,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to create memory. Please try again.");
        return;
      }

      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ──
  return (
    <div className="tb-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tb-modal">

        {/* Header */}
        <div className="tb-modal-header">
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400, color: "var(--earth)" }}>
              Create a memory
            </h3>
            <p style={{ fontSize: 12, color: "var(--earth-muted)", marginTop: 2 }}>
              Step {step} of 3
            </p>
          </div>
          <button className="tb-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="tb-modal-body">
          <Steps current={step} />

          {error && (
            <div className="tb-banner tb-banner-error" style={{ marginBottom: 20 }}>
              <div className="tb-banner-dot tb-banner-dot-red" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Step 1: Memory content ── */}
          {step === 1 && (
            <div className="tb-fade-in">
              <div className="tb-field">
                <label className="tb-label">Memory title</label>
                <input
                  className="tb-input"
                  placeholder="e.g. A message from Dad"
                  value={collectionTitle}
                  onChange={(e) => setCollectionTitle(e.target.value)}
                />
                <span style={{ fontSize: 11, color: "var(--earth-muted)" }}>
                  This is how the memory will appear to your recipient
                </span>
              </div>

              <div className="tb-field">
                <label className="tb-label">Message title</label>
                <input
                  className="tb-input"
                  placeholder="e.g. To my dearest child"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                />
              </div>

              <div className="tb-field">
                <label className="tb-label">Your message</label>
                <textarea
                  className="tb-textarea"
                  placeholder="Write your message here. Take your time — there is no rush. Your words will be waiting when the time comes."
                  value={itemContent}
                  onChange={(e) => setItemContent(e.target.value)}
                  style={{ minHeight: 160 }}
                />
              </div>

              {/* Attachments */}
              <div className="tb-field">
                <label className="tb-label">Photos & videos (optional)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {attachments.map((att, i) => (
                    <div key={i} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      background: "var(--sage-pale)",
                      border: "1px solid var(--sage-light)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 13,
                    }}>
                      <span>{att.type === "IMAGE" ? "🖼" : "🎬"}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--earth-mid)" }}>
                        {att.mediaFileName ?? att.mediaUrl}
                      </span>
                      <button
                        onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--earth-muted)", fontSize: 16, lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Upload progress bar — shown while a file is being uploaded */}
                  {uploading && uploadProgress !== null && (
                    <div style={{
                      background: "var(--ivory)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      padding: "12px 14px",
                    }}>
                      <div style={{
                        fontSize: 12,
                        color: "var(--earth-mid)",
                        marginBottom: 8,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {uploadProgress < 100
                          ? `Uploading ${uploadFileName}... ${uploadProgress}%`
                          : `✓ Upload complete`}
                      </div>
                      <div style={{
                        width: "100%",
                        height: 6,
                        background: "#EDE8DF",
                        borderRadius: 99,
                        overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%",
                          width: `${uploadProgress}%`,
                          background: "#B8965A",
                          borderRadius: 99,
                          transition: "width 0.2s ease",
                        }} />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    style={{
                      background: "var(--ivory)",
                      border: "1px dashed var(--border-dark)",
                      borderRadius: "var(--radius-sm)",
                      padding: "12px",
                      cursor: uploading ? "not-allowed" : "pointer",
                      color: "var(--earth-muted)",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      transition: "all var(--transition)",
                      opacity: uploading ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.borderColor = "var(--gold-light)"; }}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-dark)"}
                  >
                    + Add photo or video
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />
                  <span style={{ fontSize: 11, color: "var(--earth-muted)" }}>
                    JPG/PNG/WebP images up to 10MB · MP4/MOV videos up to 200MB
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Receivers ── */}
          {step === 2 && (
            <div className="tb-fade-in">
              {receivers.map((receiver, idx) => {
                const age = getAgeFromNric(receiver.idNo);
                return (
                  <div key={idx} style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: 16,
                    marginBottom: 14,
                    background: "var(--ivory)",
                  }}>
                    {/* Receiver header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--earth-mid)", letterSpacing: "0.5px" }}>
                        {receivers.length > 1 ? `Receiver ${idx + 1}` : "Receiver"}
                      </span>
                      {receivers.length > 1 && (
                        <button
                          onClick={() => removeReceiver(idx)}
                          style={{
                            background: "none",
                            border: "1px solid #FECACA",
                            color: "#DC2626",
                            borderRadius: "var(--radius-sm)",
                            padding: "3px 10px",
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Receiver type */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                      {(["ADULT", "CHILD", "UNKNOWN"] as const).map((type) => (
                        <label key={type} style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          border: `1px solid ${receiver.receiverType === type ? "var(--gold-light)" : "var(--border-dark)"}`,
                          borderRadius: "var(--radius-sm)",
                          background: receiver.receiverType === type ? "var(--gold-pale)" : "var(--ivory)",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 700,
                          color: receiver.receiverType === type ? "var(--gold)" : "var(--earth-muted)",
                          transition: "all var(--transition)",
                        }}>
                          <input
                            type="radio"
                            name={`type-${idx}`}
                            checked={receiver.receiverType === type}
                            onChange={() => updateReceiver(idx, "receiverType", type)}
                            style={{ accentColor: "var(--gold)" }}
                          />
                          {type === "ADULT" ? "Adult" : type === "CHILD" ? "Child" : "No contact yet"}
                        </label>
                      ))}
                    </div>

                    {/* Fields */}
                    <div style={{ display: "grid", gap: 10 }}>
                      <input
                        className="tb-input"
                        placeholder="NRIC / identification number *"
                        value={receiver.idNo}
                        onChange={(e) => updateReceiver(idx, "idNo", e.target.value.toUpperCase())}
                      />

                      {/* Child age warning */}
                      {age !== null && age < 18 && (
                        <div className="tb-banner tb-banner-purple" style={{ margin: 0 }}>
                          <div className="tb-banner-dot tb-banner-dot-purple" />
                          <span>
                            Approximately {age} years old.{" "}
                            {receiver.receiverType !== "CHILD" && (
                              <button
                                onClick={() => updateReceiver(idx, "receiverType", "CHILD")}
                                style={{ background: "none", border: "none", color: "#7C3AED", cursor: "pointer", fontWeight: 700, fontSize: 12, padding: 0, textDecoration: "underline" }}
                              >
                                Switch to Child
                              </button>
                            )}
                          </span>
                        </div>
                      )}

                      <input className="tb-input" placeholder="Full name *" value={receiver.name} onChange={(e) => updateReceiver(idx, "name", e.target.value)} />
                      <input className="tb-input" placeholder="Address *" value={receiver.address} onChange={(e) => updateReceiver(idx, "address", e.target.value)} />
                      <input className="tb-input" placeholder="Email (recommended)" type="email" value={receiver.email} onChange={(e) => updateReceiver(idx, "email", e.target.value)} />
                      {!receiver.email && (
                        <div style={{ fontSize: 11, color: "var(--earth-muted)", padding: "4px 8px", background: "var(--gold-pale)", borderRadius: "var(--radius-sm)" }}>
                          No email — will be delivered via guardian or admin visit
                        </div>
                      )}
                      <input className="tb-input" placeholder="Phone (optional)" value={receiver.phone} onChange={(e) => updateReceiver(idx, "phone", e.target.value)} />
                    </div>

                    {/* Guardian section */}
                    {receiver.receiverType !== "ADULT" && (
                      <div style={{
                        marginTop: 14,
                        padding: 14,
                        background: "#F5F3FF",
                        border: "1px solid #C4B5FD",
                        borderRadius: "var(--radius-md)",
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#4C1D95", marginBottom: 10, letterSpacing: "0.5px" }}>
                          GUARDIAN DETAILS — Required
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          <input className="tb-input" placeholder="Guardian full name *" value={receiver.guardianName} onChange={(e) => updateReceiver(idx, "guardianName", e.target.value)} />
                          <input className="tb-input" placeholder="Guardian NRIC *" value={receiver.guardianNric} onChange={(e) => updateReceiver(idx, "guardianNric", e.target.value.toUpperCase())} />
                          <input className="tb-input" placeholder="Guardian email *" type="email" value={receiver.guardianEmail} onChange={(e) => updateReceiver(idx, "guardianEmail", e.target.value)} />
                          <input className="tb-input" placeholder="Guardian phone *" value={receiver.guardianPhone} onChange={(e) => updateReceiver(idx, "guardianPhone", e.target.value)} />
                          <input className="tb-input" placeholder="Guardian address *" value={receiver.guardianAddress} onChange={(e) => updateReceiver(idx, "guardianAddress", e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add receiver */}
              <button
                onClick={addReceiver}
                style={{
                  width: "100%",
                  background: "var(--ivory)",
                  border: "1px dashed var(--gold-light)",
                  color: "var(--gold)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all var(--transition)",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--gold-pale)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "var(--ivory)"}
              >
                + Add another receiver
              </button>
            </div>
          )}

          {/* ── Step 3: Release settings ── */}
          {step === 3 && (
            <div className="tb-fade-in">
              <div style={{ marginBottom: 20 }}>
                <div className="tb-label" style={{ marginBottom: 12 }}>When should this memory be released?</div>

                {/* Release mode options */}
                <div style={{ display: "grid", gap: 10 }}>
                  {[
                    {
                      mode: "PROOF" as const,
                      title: "When I stop checking in",
                      desc: "Released automatically if I miss my proof-of-life confirmations. This is the most common choice.",
                      icon: "🕊️",
                    },
                    {
                      mode: "DATE" as const,
                      title: "On a specific date",
                      desc: "Released on a date and time you choose — regardless of your proof-of-life status.",
                      icon: "📅",
                    },
                  ].map((opt) => (
                    <div
                      key={opt.mode}
                      onClick={() => setReleaseMode(opt.mode)}
                      style={{
                        padding: "16px 18px",
                        border: `2px solid ${releaseMode === opt.mode ? "var(--gold)" : "var(--border-dark)"}`,
                        borderRadius: "var(--radius-md)",
                        background: releaseMode === opt.mode ? "var(--gold-pale)" : "var(--ivory)",
                        cursor: "pointer",
                        transition: "all var(--transition)",
                        display: "flex",
                        gap: 14,
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ fontSize: 24, flexShrink: 0 }}>{opt.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: releaseMode === opt.mode ? "var(--gold)" : "var(--earth)", marginBottom: 4 }}>
                          {opt.title}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--earth-muted)", lineHeight: 1.6 }}>
                          {opt.desc}
                        </div>
                      </div>
                      <div style={{
                        width: 20, height: 20,
                        borderRadius: "50%",
                        border: `2px solid ${releaseMode === opt.mode ? "var(--gold)" : "var(--border-dark)"}`,
                        background: releaseMode === opt.mode ? "var(--gold)" : "transparent",
                        flexShrink: 0,
                        marginLeft: "auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        {releaseMode === opt.mode && (
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ivory)" }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date picker */}
              {releaseMode === "DATE" && (
                <div className="tb-fade-in" style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                  <div className="tb-field" style={{ margin: 0 }}>
                    <label className="tb-label">Release date</label>
                    <input
                      className="tb-input"
                      type="date"
                      value={releaseDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setReleaseDate(e.target.value)}
                    />
                  </div>
                  <div className="tb-field" style={{ margin: 0 }}>
                    <label className="tb-label">Release time (SGT)</label>
                    <input
                      className="tb-input"
                      type="time"
                      value={releaseTime}
                      onChange={(e) => setReleaseTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Summary */}
              <div style={{
                marginTop: 20,
                padding: "14px 18px",
                background: "var(--cream)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
              }}>
                <div className="tb-section-label" style={{ marginBottom: 10 }}>Memory summary</div>
                <div style={{ fontSize: 13, color: "var(--earth-mid)", lineHeight: 2 }}>
                  <div><strong>Title:</strong> {collectionTitle}</div>
                  <div><strong>Recipients:</strong> {receivers.map((r) => r.name || "—").join(", ")}</div>
                  <div>
                    <strong>Release:</strong>{" "}
                    {releaseMode === "PROOF"
                      ? "When proof-of-life is missed"
                      : releaseDate
                      ? `${new Date(`${releaseDate}T${releaseTime}:00+08:00`).toLocaleString("en-SG", { timeZone: "Asia/Singapore", dateStyle: "long", timeStyle: "short" })} SGT`
                      : "Date not set"}
                  </div>
                  {attachments.length > 0 && (
                    <div><strong>Attachments:</strong> {attachments.length} file{attachments.length > 1 ? "s" : ""}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="tb-modal-footer">
          {step > 1 && (
            <button className="tb-btn tb-btn-outline" onClick={goBack} disabled={loading}>
              Back
            </button>
          )}
          <button className="tb-btn tb-btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          {step < 3 ? (
            <button className="tb-btn tb-btn-primary" onClick={goNext}>
              Continue →
            </button>
          ) : (
            <button className="tb-btn tb-btn-gold" onClick={submit} disabled={loading}>
              {loading ? "Saving..." : "Save memory 💌"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
