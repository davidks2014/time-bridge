"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatSingaporeDateTime } from "@/lib/sg-time";
import { getOptimizedImageUrl, getOptimizedVideoUrl } from "@/lib/cloudinary-media";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

/**
 * Page: /memory-sent/[memoryId]
 * Purpose: View and edit a specific memory collection
 * Features: Edit message, set release date, add/delete attachments, recall, delete
 */

const MAX_EDIT_ATTACHMENTS_PER_ADD = 5;
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 200;

type MemoryItemStatus = "DRAFT" | "RELEASED";
type AttachmentType = "IMAGE" | "VIDEO";

type MemoryAttachment = {
  id: string;
  type: AttachmentType;
  mediaUrl: string;
  mediaPublicId: string;
  mediaFileName: string | null;
  mediaMimeType: string | null;
  createdAt: string;
};

type MemoryItem = {
  id: string;
  title: string;
  content: string;
  releaseDate: string | null;
  releasedAt: string | null;
  status: MemoryItemStatus;
  createdAt: string;
  updatedAt: string;
  attachments?: MemoryAttachment[];
  attachmentCount?: number;
};

type Receiver = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  identificationNo: string;
  linkedUserId: string | null;
};

type Memory = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  receiver: Receiver;
  items: MemoryItem[];
};

type UploadedAttachment = {
  type: AttachmentType;
  mediaUrl: string;
  mediaPublicId: string;
  mediaFileName: string | null;
  mediaMimeType: string | null;
  mediaSizeBytes: number;
};

function splitDateTimeForInput(isoString: string | null): { dateOnly: string; timeOnly: string } {
  if (!isoString) return { dateOnly: "", timeOnly: "" };
  const d = new Date(isoString);
  const dateOnly = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const timeOnly = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return { dateOnly, timeOnly };
}

function normalizeMemory(raw: any): Memory {
  return {
    id: String(raw?.id ?? ""),
    title: String(raw?.title ?? ""),
    status: String(raw?.status ?? ""),
    createdAt: String(raw?.createdAt ?? ""),
    updatedAt: String(raw?.updatedAt ?? ""),
    receiver: {
      id: String(raw?.receiver?.id ?? ""),
      fullName: String(raw?.receiver?.fullName ?? ""),
      email: String(raw?.receiver?.email ?? ""),
      phone: String(raw?.receiver?.phone ?? ""),
      address: String(raw?.receiver?.address ?? ""),
      identificationNo: String(raw?.receiver?.identificationNo ?? ""),
      linkedUserId: raw?.receiver?.linkedUserId ?? null,
    },
    items: Array.isArray(raw?.items) ? raw.items.map((item: any) => ({
      id: String(item?.id ?? ""),
      title: String(item?.title ?? ""),
      content: String(item?.content ?? ""),
      releaseDate: item?.releaseDate ?? null,
      releasedAt: item?.releasedAt ?? null,
      status: (item?.status ?? "DRAFT") as MemoryItemStatus,
      createdAt: String(item?.createdAt ?? ""),
      updatedAt: String(item?.updatedAt ?? ""),
      attachments: Array.isArray(item?.attachments) ? item.attachments.map((att: any) => ({
        id: String(att?.id ?? ""),
        type: String(att?.type ?? "IMAGE") as AttachmentType,
        mediaUrl: String(att?.mediaUrl ?? ""),
        mediaPublicId: String(att?.mediaPublicId ?? ""),
        mediaFileName: att?.mediaFileName ? String(att.mediaFileName) : null,
        mediaMimeType: att?.mediaMimeType ? String(att.mediaMimeType) : null,
        createdAt: String(att?.createdAt ?? ""),
      })) : [],
      attachmentCount: Array.isArray(item?.attachments) ? item.attachments.length : Number(item?.attachmentCount ?? 0),
    })) : [],
  };
}

export default function MemoryDetailsPage({ params }: { params: Promise<{ memoryId: string }> }) {
  const router = useRouter();
  const { status } = useSession();

  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editReleaseMode, setEditReleaseMode] = useState<"LATER" | "NOW">("LATER");
  const [editReleaseDateOnly, setEditReleaseDateOnly] = useState("");
  const [editReleaseTimeOnly, setEditReleaseTimeOnly] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [newEditFiles, setNewEditFiles] = useState<File[]>([]);
  const [newEditFileError, setNewEditFileError] = useState("");
  const [addingAttachments, setAddingAttachments] = useState(false);
  const [recalling, setRecalling] = useState(false);
  const [recallError, setRecallError] = useState("");
  const [recallInfo, setRecallInfo] = useState("");

  const isLocked = useMemo(() => {
    if (!memory) return false;
    return memory.items.some((i) => i.status === "RELEASED");
  }, [memory]);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  async function loadMemory() {
    setPageError(""); setAttachmentError(""); setLoading(true);
    try {
      const { memoryId } = await params;
      const res = await fetch(`/api/memory-sent/${memoryId}`);
      const json = await res.json();
      if (!res.ok) { setPageError(json?.error ?? "Failed to load memory."); setMemory(null); return; }
      setMemory(normalizeMemory(json.memory));
    } catch { setPageError("Network error."); } finally { setLoading(false); }
  }

  useEffect(() => { if (status === "authenticated") loadMemory(); }, [status]);

  async function recallMemory() {
    if (!memory) return;
    if (!window.confirm("Are you sure you want to recall this memory? It will be moved back to draft. This can only be done within 24 hours of release.")) return;
    setRecalling(true); setRecallError(""); setRecallInfo("");
    try {
      const res = await fetch("/api/memory/recall", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collectionId: memory.id }) });
      const json = await res.json();
      if (!res.ok) { setRecallError(json?.error ?? "Recall failed."); return; }
      setRecallInfo("Memory recalled successfully. Reloading...");
      setTimeout(() => loadMemory(), 1500);
    } catch { setRecallError("Network error."); } finally { setRecalling(false); }
  }

  async function deleteMemory() {
    if (!memory) return;
    if (isLocked) { setPageError("This memory is locked and cannot be deleted after release."); return; }
    if (!window.confirm("Delete this entire memory? This will delete all messages inside.")) return;
    setDeleting(true); setPageError("");
    try {
      const res = await fetch(`/api/memory-sent/${memory.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { setPageError(json?.error ?? "Failed to delete."); return; }
      router.push("/memory-sent");
    } catch { setPageError("Network error."); } finally { setDeleting(false); }
  }

  async function deleteAttachment(itemId: string, attachmentId: string) {
    if (!memory || isLocked) return;
    if (!window.confirm("Delete this attachment?")) return;
    setDeletingAttachmentId(attachmentId); setAttachmentError("");
    try {
      const res = await fetch(`/api/memory-sent/${memory.id}/attachments/${attachmentId}?itemId=${encodeURIComponent(itemId)}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { setAttachmentError(json?.error ?? "Failed to delete attachment."); return; }
      await loadMemory();
    } catch { setAttachmentError("Network error."); } finally { setDeletingAttachmentId(null); }
  }

  function startEdit(item: MemoryItem) {
    if (isLocked) { setEditError("This memory is locked because a message has already been released."); return; }
    setEditError(""); setAttachmentError(""); setNewEditFiles([]); setNewEditFileError("");
    setEditingItemId(item.id); setEditTitle(item.title); setEditContent(item.content ?? "");
    if (item.releaseDate) {
      const split = splitDateTimeForInput(item.releaseDate);
      setEditReleaseMode("NOW"); setEditReleaseDateOnly(split.dateOnly); setEditReleaseTimeOnly(split.timeOnly);
    } else { setEditReleaseMode("LATER"); setEditReleaseDateOnly(""); setEditReleaseTimeOnly(""); }
  }

  function cancelEdit() {
    setEditingItemId(null); setEditTitle(""); setEditContent("");
    setEditReleaseMode("LATER"); setEditReleaseDateOnly(""); setEditReleaseTimeOnly("");
    setEditError(""); setAttachmentError(""); setNewEditFiles([]); setNewEditFileError("");
  }

  function handleNewEditFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); setNewEditFileError("");
    if (!files.length) { e.target.value = ""; return; }
    let updated = [...newEditFiles];
    for (const file of files) {
      if (updated.length >= MAX_EDIT_ATTACHMENTS_PER_ADD) { setNewEditFileError(`Maximum ${MAX_EDIT_ATTACHMENTS_PER_ADD} files allowed.`); break; }
      if (updated.some((f) => f.name === file.name && f.size === file.size)) continue;
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) { setNewEditFileError("Only image or video files allowed."); continue; }
      const maxBytes = isImage ? MAX_IMAGE_MB * 1024 * 1024 : MAX_VIDEO_MB * 1024 * 1024;
      if (file.size > maxBytes) { setNewEditFileError(isImage ? `Image too large (max ${MAX_IMAGE_MB}MB)` : `Video too large (max ${MAX_VIDEO_MB}MB)`); continue; }
      updated.push(file);
    }
    setNewEditFiles(updated); e.target.value = "";
  }

  async function uploadOneAttachment(file: File): Promise<UploadedAttachment> {
    const attachmentType: AttachmentType = file.type.startsWith("image/") ? "IMAGE" : "VIDEO";
    const signRes = await fetch("/api/media/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemType: attachmentType, fileName: file.name, contentType: file.type }) });
    const signJson = await signRes.json();
    if (!signRes.ok) throw new Error(signJson?.error ?? "Failed to get upload URL.");
    const uploadRes = await fetch(signJson.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!uploadRes.ok) throw new Error("Upload to storage failed.");
    const sizeMB = file.size / (1024 * 1024);
    fetch("/api/media/confirm-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sizeMB }) }).catch(() => {});
    return { type: attachmentType, mediaUrl: signJson.cdnUrl, mediaPublicId: signJson.key, mediaFileName: file.name ?? null, mediaMimeType: file.type ?? null, mediaSizeBytes: file.size };
  }

  async function addAttachmentsToItem(itemId: string) {
    if (!memory || !editingItemId || editingItemId !== itemId || isLocked) return;
    if (newEditFiles.length === 0) { setNewEditFileError("Please select at least one file."); return; }
    setAddingAttachments(true); setAttachmentError(""); setNewEditFileError("");
    try {
      const uploaded: UploadedAttachment[] = [];
      for (const file of newEditFiles) uploaded.push(await uploadOneAttachment(file));
      for (const attachment of uploaded) {
        const res = await fetch(`/api/memory-sent/${memory.id}/items/${itemId}/attachments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(attachment) });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to attach file.");
      }
      setNewEditFiles([]); await loadMemory();
    } catch (err) { setAttachmentError((err as Error)?.message || "Failed to add attachments."); } finally { setAddingAttachments(false); }
  }

  async function saveEdit() {
    if (!memory || !editingItemId || isLocked) return;
    if (!editTitle.trim()) { setEditError("Title cannot be empty."); return; }
    if (!editContent.trim()) { setEditError("Content cannot be empty."); return; }
    const dateTime = editReleaseMode === "NOW" && editReleaseDateOnly && editReleaseTimeOnly ? `${editReleaseDateOnly}T${editReleaseTimeOnly}` : null;
    if (editReleaseMode === "NOW" && !dateTime) { setEditError("Please choose a release date and time."); return; }
    setSaving(true); setEditError("");
    try {
      const res = await fetch(`/api/memory-sent/${memory.id}/items/${editingItemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim(), releaseDate: dateTime }) });
      const json = await res.json();
      if (!res.ok) { setEditError(json?.error ?? "Failed to update."); return; }
      await loadMemory(); cancelEdit();
    } catch { setEditError("Network error."); } finally { setSaving(false); }
  }

  if (status === "loading" || loading) return <TimeBridgeLoading message="Loading memory..." />;

  if (!memory) return (
    <div className="tb-page tb-page-with-tabs">
      <div className="tb-container" style={{ paddingTop: 32 }}>
        <div className="tb-empty">
          <div className="tb-empty-title">Memory not found</div>
          <div className="tb-empty-body">{pageError || "This memory does not exist or you do not have access."}</div>
          <button className="tb-btn tb-btn-outline" onClick={() => router.push("/memory-sent")} style={{ marginTop: 20 }}>← Back to memories</button>
        </div>
      </div>
    </div>
  );

  const releasedItems = memory.items.filter((i) => i.status === "RELEASED" && i.releasedAt);
  const earliestRelease = releasedItems.reduce((earliest, item) => {
    if (!item.releasedAt) return earliest;
    const d = new Date(item.releasedAt);
    return !earliest || d < earliest ? d : earliest;
  }, null as Date | null);
  const hoursSinceRelease = earliestRelease ? (Date.now() - earliestRelease.getTime()) / (1000 * 60 * 60) : null;
  const canRecall = hoursSinceRelease !== null && hoursSinceRelease <= 24;
  const hoursLeft = canRecall ? Math.max(0, 24 - Math.floor(hoursSinceRelease!)) : 0;

  return (
    <div className="tb-page tb-page-with-tabs">
      <div className="tb-container" style={{ paddingTop: 32, paddingBottom: 48 }}>

        {/* Header */}
        <div className="tb-page-header tb-fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <button onClick={() => router.push("/memory-sent")} style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)", padding: 0, marginBottom: 8, display: "block" }}>
                ← Back to memories
              </button>
              <h1 style={{ marginBottom: 4 }}>{memory.title}</h1>
              <p style={{ color: "var(--earth-muted)", fontSize: 13 }}>
                Created {formatSingaporeDateTime(memory.createdAt)} SGT
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {!isLocked && (
                <button
                  className="tb-btn tb-btn-danger"
                  onClick={deleteMemory}
                  disabled={deleting}
                  style={{ fontSize: 12, padding: "8px 16px" }}
                >
                  {deleting ? "Deleting..." : "Delete memory"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Errors */}
        {pageError && <div className="tb-banner tb-banner-error tb-fade-in" style={{ marginBottom: 16 }}><div className="tb-banner-dot tb-banner-dot-red" /><span>{pageError}</span></div>}

        {/* Locked banner */}
        {isLocked && (
          <div className="tb-banner tb-banner-gold tb-fade-in" style={{ marginBottom: 20 }}>
            <div className="tb-banner-dot tb-banner-dot-gold" />
            <span>This memory is locked — at least one message has been released and can no longer be edited.</span>
          </div>
        )}

        {/* Emergency recall banner */}
        {canRecall && (
          <div className="tb-banner tb-fade-in" style={{ marginBottom: 20, background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <div className="tb-banner-dot" style={{ background: "#DC2626" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#7F1D1D", fontSize: 13, marginBottom: 4 }}>
                Emergency recall available — {hoursLeft} hour{hoursLeft !== 1 ? "s" : ""} remaining
              </div>
              <div style={{ fontSize: 12, color: "#B91C1C", lineHeight: 1.6, marginBottom: 10 }}>
                This memory was recently released. You can recall it within 24 hours if the receiver has not yet claimed it.
              </div>
              {recallError && <div style={{ fontSize: 12, color: "#991B1B", marginBottom: 8 }}>{recallError}</div>}
              {recallInfo && <div style={{ fontSize: 12, color: "#166534", marginBottom: 8 }}>{recallInfo}</div>}
              <button
                className="tb-btn tb-btn-danger"
                onClick={recallMemory}
                disabled={recalling}
                style={{ fontSize: 11, padding: "6px 14px" }}
              >
                {recalling ? "Recalling..." : "Emergency recall"}
              </button>
            </div>
          </div>
        )}

        {/* Receiver card */}
        <div className="tb-card tb-fade-in tb-stagger-1" style={{ marginBottom: 20 }}>
          <div className="tb-section-label" style={{ marginBottom: 12 }}>Recipient</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--gold-pale)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "var(--gold)", flexShrink: 0 }}>
              {memory.receiver.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--earth)", marginBottom: 2 }}>{memory.receiver.fullName}</div>
              <div style={{ fontSize: 13, color: "var(--earth-muted)" }}>{memory.receiver.identificationNo}</div>
            </div>
            {memory.receiver.linkedUserId && (
              <span className="tb-badge tb-badge-released">Claimed</span>
            )}
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 6, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            {[
              { label: "Email", value: memory.receiver.email || "Not provided" },
              { label: "Phone", value: memory.receiver.phone || "Not provided" },
              { label: "Address", value: memory.receiver.address },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 12 }}>
                <span style={{ color: "var(--earth-muted)" }}>{row.label}</span>
                <span style={{ color: "var(--earth-mid)", fontWeight: 700, textAlign: "right" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="tb-section-label" style={{ marginBottom: 12 }}>Messages ({memory.items.length})</div>

        {attachmentError && <div className="tb-banner tb-banner-error" style={{ marginBottom: 16 }}><div className="tb-banner-dot tb-banner-dot-red" /><span>{attachmentError}</span></div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {memory.items.map((item, idx) => {
            const isEditing = editingItemId === item.id;
            const attachments = item.attachments ?? [];
            const isReleased = item.status === "RELEASED";

            return (
              <div key={item.id} className={`tb-card tb-fade-in`} style={{ animationDelay: `${idx * 0.05}s`, borderLeft: `4px solid ${isReleased ? "var(--sage-light)" : "var(--gold-light)"}`, borderRadius: "var(--radius-md)" }}>

                {!isEditing ? (
                  <>
                    {/* View mode */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 500, color: "var(--earth)", marginBottom: 4 }}>{item.title}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <span className={`tb-badge ${isReleased ? "tb-badge-released" : "tb-badge-draft"}`}>{isReleased ? "Released" : "Draft"}</span>
                          {attachments.length > 0 && <span style={{ fontSize: 12, color: "var(--earth-muted)" }}>{attachments.length} attachment{attachments.length > 1 ? "s" : ""}</span>}
                        </div>
                      </div>
                      {!isLocked && (
                        <button className="tb-btn tb-btn-outline" onClick={() => startEdit(item)} style={{ fontSize: 12, padding: "7px 16px" }}>
                          Edit
                        </button>
                      )}
                    </div>

                    {/* Release info */}
                    <div style={{ background: "var(--cream)", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--earth-muted)" }}>
                      {isReleased && item.releasedAt ? (
                        <span>Released on <strong style={{ color: "var(--sage)" }}>{formatSingaporeDateTime(item.releasedAt)} SGT</strong></span>
                      ) : item.releaseDate ? (
                        <span>Scheduled for <strong style={{ color: "var(--gold)" }}>{formatSingaporeDateTime(item.releaseDate)} SGT</strong></span>
                      ) : (
                        <span>Releases when <strong style={{ color: "var(--earth-mid)" }}>proof-of-life is missed</strong></span>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ fontSize: 15, color: "var(--text-body)", lineHeight: 1.8, whiteSpace: "pre-wrap", marginBottom: attachments.length > 0 ? 16 : 0 }}>
                      {item.content}
                    </div>

                    {/* Attachments */}
                    {attachments.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                        <div className="tb-section-label">Attachments</div>
                        {attachments.map((att) => {
                          const imageUrl = att.type === "IMAGE" ? getOptimizedImageUrl(att.mediaUrl, att.mediaPublicId, { width: 1200 }) : null;
                          const videoUrl = att.type === "VIDEO" ? getOptimizedVideoUrl(att.mediaUrl, att.mediaPublicId, { width: 1280 }) : null;
                          return (
                            <div key={att.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--cream)" }}>
                                <span style={{ fontSize: 12, color: "var(--earth-muted)" }}>{att.type} {att.mediaFileName ? `· ${att.mediaFileName}` : ""}</span>
                                {!isLocked && (
                                  <button
                                    className="tb-btn tb-btn-ghost"
                                    onClick={() => deleteAttachment(item.id, att.id)}
                                    disabled={deletingAttachmentId === att.id}
                                    style={{ fontSize: 11, color: "#DC2626", padding: "4px 10px" }}
                                  >
                                    {deletingAttachmentId === att.id ? "Deleting..." : "Delete"}
                                  </button>
                                )}
                              </div>
                              {att.type === "IMAGE" && imageUrl && (
                                <img src={imageUrl} alt={att.mediaFileName ?? item.title} style={{ width: "100%", maxHeight: 360, objectFit: "cover", display: "block" }} />
                              )}
                              {att.type === "VIDEO" && videoUrl && (
                                <video controls preload="metadata" style={{ width: "100%", maxHeight: 360, display: "block" }} src={videoUrl}>
                                  Your browser does not support video.
                                </video>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Edit mode */}
                    <div className="tb-section-label" style={{ marginBottom: 16 }}>Editing message</div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div className="tb-field">
                        <label className="tb-label">Message title</label>
                        <input className="tb-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      </div>

                      <div className="tb-field">
                        <label className="tb-label">Your message</label>
                        <textarea className="tb-textarea" value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={6} />
                      </div>

                      {/* Existing attachments */}
                      {attachments.length > 0 && (
                        <div>
                          <div className="tb-section-label" style={{ marginBottom: 10 }}>Current attachments</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {attachments.map((att) => {
                              const imageUrl = att.type === "IMAGE" ? getOptimizedImageUrl(att.mediaUrl, att.mediaPublicId, { width: 900 }) : null;
                              const videoUrl = att.type === "VIDEO" ? getOptimizedVideoUrl(att.mediaUrl, att.mediaPublicId, { width: 960 }) : null;
                              return (
                                <div key={att.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--cream)" }}>
                                    <span style={{ fontSize: 12, color: "var(--earth-muted)" }}>{att.type}{att.mediaFileName ? ` · ${att.mediaFileName}` : ""}</span>
                                    <button className="tb-btn tb-btn-ghost" onClick={() => deleteAttachment(item.id, att.id)} disabled={deletingAttachmentId === att.id} style={{ fontSize: 11, color: "#DC2626", padding: "4px 10px" }}>
                                      {deletingAttachmentId === att.id ? "Deleting..." : "Delete"}
                                    </button>
                                  </div>
                                  {att.type === "IMAGE" && imageUrl && <img src={imageUrl} alt={att.mediaFileName ?? ""} style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }} />}
                                  {att.type === "VIDEO" && videoUrl && <video controls preload="metadata" style={{ width: "100%", maxHeight: 240, display: "block" }} src={videoUrl} />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Add attachments */}
                      <div style={{ background: "var(--cream)", border: "1px dashed var(--border-dark)", borderRadius: "var(--radius-sm)", padding: 16 }}>
                        <div className="tb-section-label" style={{ marginBottom: 10 }}>Add attachments</div>
                        <input type="file" multiple accept="image/*,video/*" onChange={handleNewEditFilesChange} disabled={addingAttachments} style={{ fontSize: 13, width: "100%" }} />
                        {newEditFileError && <div style={{ color: "#DC2626", fontSize: 12, marginTop: 8 }}>{newEditFileError}</div>}
                        {newEditFiles.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            {newEditFiles.map((file, index) => (
                              <div key={index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--earth-muted)", padding: "4px 0" }}>
                                <span>{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                                <button onClick={() => setNewEditFiles((p) => p.filter((_, i) => i !== index))} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 12 }}>Remove</button>
                              </div>
                            ))}
                            <button className="tb-btn tb-btn-outline" onClick={() => addAttachmentsToItem(item.id)} disabled={addingAttachments} style={{ marginTop: 10, fontSize: 12, padding: "8px 16px" }}>
                              {addingAttachments ? "Uploading..." : "Upload attachments"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Release date */}
                      <div>
                        <div className="tb-label" style={{ marginBottom: 10 }}>Release timing</div>
                        <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
                          {[
                            { value: "LATER", label: "Set date later" },
                            { value: "NOW", label: "Set specific date" },
                          ].map((opt) => (
                            <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
                              <input type="radio" name={`editMode-${item.id}`} checked={editReleaseMode === opt.value} onChange={() => { setEditReleaseMode(opt.value as "LATER" | "NOW"); if (opt.value === "LATER") { setEditReleaseDateOnly(""); setEditReleaseTimeOnly(""); } }} style={{ accentColor: "var(--gold)" }} />
                              <span style={{ color: "var(--earth-mid)" }}>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                        {editReleaseMode === "NOW" && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div className="tb-field" style={{ margin: 0 }}>
                              <label className="tb-label">Date (SGT)</label>
                              <input className="tb-input" type="date" value={editReleaseDateOnly} onChange={(e) => setEditReleaseDateOnly(e.target.value)} />
                            </div>
                            <div className="tb-field" style={{ margin: 0 }}>
                              <label className="tb-label">Time (SGT)</label>
                              <input className="tb-input" type="time" value={editReleaseTimeOnly} step={60} onChange={(e) => setEditReleaseTimeOnly(e.target.value)} />
                            </div>
                          </div>
                        )}
                      </div>

                      {editError && <div className="tb-banner tb-banner-error"><div className="tb-banner-dot tb-banner-dot-red" /><span>{editError}</span></div>}

                      <div style={{ display: "flex", gap: 10 }}>
                        <button className="tb-btn tb-btn-gold" onClick={saveEdit} disabled={saving || addingAttachments} style={{ fontSize: 13 }}>
                          {saving ? "Saving..." : "Save changes"}
                        </button>
                        <button className="tb-btn tb-btn-outline" onClick={cancelEdit} disabled={saving || addingAttachments} style={{ fontSize: 13 }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
