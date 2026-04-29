"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatSingaporeDateTime } from "@/lib/sg-time";
import {
  getOptimizedImageUrl,
  getOptimizedVideoUrl,
} from "@/lib/cloudinary-media";

const MAX_EDIT_ATTACHMENTS_PER_ADD = 5;
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 100;

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
  updatedAt?: string;
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

type B2SignResponse = {
  uploadUrl: string;
  cdnUrl: string;
  key: string;
  itemType: AttachmentType;
  error?: string;
};

function splitDateTimeForInput(isoString: string | null): {
  dateOnly: string;
  timeOnly: string;
} {
  if (!isoString) {
    return { dateOnly: "", timeOnly: "" };
  }

  const d = new Date(isoString);

  const singaporeDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const singaporeTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Singapore",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return {
    dateOnly: singaporeDate.format(d),
    timeOnly: singaporeTime.format(d),
  };
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
    items: Array.isArray(raw?.items)
      ? raw.items.map((item: any) => ({
          id: String(item?.id ?? ""),
          title: String(item?.title ?? ""),
          content: String(item?.content ?? ""),
          releaseDate: item?.releaseDate ?? null,
          releasedAt: item?.releasedAt ?? null,
          status: (item?.status ?? "DRAFT") as MemoryItemStatus,
          createdAt: String(item?.createdAt ?? ""),
          updatedAt: String(item?.updatedAt ?? ""),
          attachments: Array.isArray(item?.attachments)
            ? item.attachments.map((att: any) => ({
                id: String(att?.id ?? ""),
                type: String(att?.type ?? "IMAGE") as AttachmentType,
                mediaUrl: String(att?.mediaUrl ?? ""),
                mediaPublicId: String(att?.mediaPublicId ?? ""),
                mediaFileName: att?.mediaFileName ? String(att.mediaFileName) : null,
                mediaMimeType: att?.mediaMimeType ? String(att.mediaMimeType) : null,
                createdAt: String(att?.createdAt ?? ""),
                updatedAt: att?.updatedAt ? String(att.updatedAt) : undefined,
              }))
            : [],
          attachmentCount: Array.isArray(item?.attachments)
            ? item.attachments.length
            : Number(item?.attachmentCount ?? 0),
        }))
      : [],
  };
}

export default function MemoryDetailsPage({
  params,
}: {
  params: Promise<{ memoryId: string }>;
}) {
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

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function recallMemory() {
    if (!memory) return;

    const confirmed = window.confirm(
      "Are you sure you want to recall this memory? " +
      "It will be moved back to draft. This can only be done within 24 hours of release."
    );

    if (!confirmed) return;

    setRecalling(true);
    setRecallError("");
    setRecallInfo("");

    try {
      const res = await fetch("/api/memory/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: memory.id }),
      });

      const json = await res.json();

      if (!res.ok) {
        setRecallError(json?.error ?? "Recall failed. Please try again.");
        return;
      }

      setRecallInfo(
        "Memory recalled successfully. It has been moved back to draft. Reloading..."
      );
      setTimeout(() => loadMemory(), 1500);

    } catch {
      setRecallError("Network error. Please try again.");
    } finally {
      setRecalling(false);
    }
  }

  async function loadMemory() {
    setPageError("");
    setAttachmentError("");
    setLoading(true);

    try {
      const { memoryId } = await params;
      const res = await fetch(`/api/memory-sent/${memoryId}`);
      const json = await res.json();

      if (!res.ok) {
        setPageError(json?.error ?? "Failed to load memory.");
        setMemory(null);
        return;
      }

      setMemory(normalizeMemory(json.memory));
    } catch {
      setPageError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") loadMemory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function resetEditReleaseInputs() {
    setEditReleaseDateOnly("");
    setEditReleaseTimeOnly("");
  }

  function buildEditReleaseDateTime(): string | null {
    const datePart = editReleaseDateOnly.trim();
    const timePart = editReleaseTimeOnly.trim();

    if (!datePart || !timePart) return null;

    return `${datePart}T${timePart}`;
  }

  function resetNewEditFiles() {
    setNewEditFiles([]);
    setNewEditFileError("");
  }

  function inferAttachmentType(file: File): AttachmentType {
    if (file.type.startsWith("image/")) return "IMAGE";
    if (file.type.startsWith("video/")) return "VIDEO";
    throw new Error(`Unsupported file type: ${file.name}`);
  }

  function startEdit(item: MemoryItem) {
    setEditError("");
    setAttachmentError("");
    resetNewEditFiles();

    if (isLocked) {
      setEditError("This memory is locked because at least one message has already been released.");
      return;
    }

    setEditingItemId(item.id);
    setEditTitle(item.title);
    setEditContent(item.content ?? "");

    if (item.releaseDate) {
      const split = splitDateTimeForInput(item.releaseDate);
      setEditReleaseMode("NOW");
      setEditReleaseDateOnly(split.dateOnly);
      setEditReleaseTimeOnly(split.timeOnly);
    } else {
      setEditReleaseMode("LATER");
      resetEditReleaseInputs();
    }
  }

  function cancelEdit() {
    setEditingItemId(null);
    setEditTitle("");
    setEditContent("");
    setEditReleaseMode("LATER");
    resetEditReleaseInputs();
    setEditError("");
    setAttachmentError("");
    resetNewEditFiles();
  }

  function handleNewEditFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setNewEditFileError("");

    if (!files.length) {
      e.target.value = "";
      return;
    }

    let updated = [...newEditFiles];

    for (const file of files) {
      if (updated.length >= MAX_EDIT_ATTACHMENTS_PER_ADD) {
        setNewEditFileError(`Maximum ${MAX_EDIT_ATTACHMENTS_PER_ADD} files allowed each time.`);
        break;
      }

      const exists = updated.some((f) => f.name === file.name && f.size === file.size);
      if (exists) continue;

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        setNewEditFileError("Only image or video files allowed.");
        continue;
      }

      const maxBytes = isImage
        ? MAX_IMAGE_MB * 1024 * 1024
        : MAX_VIDEO_MB * 1024 * 1024;

      if (file.size > maxBytes) {
        setNewEditFileError(
          isImage
            ? `Image too large (max ${MAX_IMAGE_MB}MB)`
            : `Video too large (max ${MAX_VIDEO_MB}MB)`
        );
        continue;
      }

      updated.push(file);
    }

    setNewEditFiles(updated);
    e.target.value = "";
  }

  function removeNewEditFile(indexToRemove: number) {
    setNewEditFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setNewEditFileError("");
  }

  async function uploadOneAttachment(file: File): Promise<UploadedAttachment> {
    const attachmentType = inferAttachmentType(file);

    // Step 1: Get presigned B2 upload URL
    const signRes = await fetch("/api/media/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemType: attachmentType,
        fileName: file.name,
        contentType: file.type,
      }),
    });

    const signJson = (await signRes.json()) as B2SignResponse;
    if (!signRes.ok) {
      throw new Error(signJson?.error ?? "Failed to get upload URL.");
    }

    // Step 2: PUT file directly to B2 via presigned URL
    const uploadRes = await fetch(signJson.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error("Upload to storage failed.");
    }

    return {
      type: attachmentType,
      mediaUrl: signJson.cdnUrl,
      mediaPublicId: signJson.key,
      mediaFileName: file.name ?? null,
      mediaMimeType: file.type ?? null,
      mediaSizeBytes: file.size,
    };
  }

  async function addAttachmentsToItem(itemId: string) {
    if (!memory) return;
    if (!editingItemId || editingItemId !== itemId) return;

    setAttachmentError("");
    setNewEditFileError("");

    if (isLocked) {
      setAttachmentError("This memory is locked. You cannot add attachments after release.");
      return;
    }

    if (newEditFiles.length === 0) {
      setNewEditFileError("Please select at least one file.");
      return;
    }

    setAddingAttachments(true);

    try {
      const uploadedAttachments: UploadedAttachment[] = [];

      for (const file of newEditFiles) {
        const uploaded = await uploadOneAttachment(file);
        uploadedAttachments.push(uploaded);
      }

      for (const attachment of uploadedAttachments) {
        const res = await fetch(
          `/api/memory-sent/${memory.id}/items/${itemId}/attachments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(attachment),
          }
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error ?? "Failed to attach uploaded file to item.");
        }
      }

      resetNewEditFiles();
      await loadMemory();
    } catch (err) {
      setAttachmentError((err as Error)?.message || "Failed to add attachments.");
    } finally {
      setAddingAttachments(false);
    }
  }

  async function saveEdit() {
    if (!memory || !editingItemId) return;

    setEditError("");

    if (isLocked) {
      setEditError("This memory is locked. You cannot edit after any message is released.");
      return;
    }

    if (!editTitle.trim()) {
      setEditError("Title cannot be empty.");
      return;
    }

    const item = memory.items.find((x) => x.id === editingItemId);
    if (!item) {
      setEditError("Item not found.");
      return;
    }

    if (!editContent.trim()) {
      setEditError("Content cannot be empty.");
      return;
    }

    const normalizedEditReleaseDateTime = buildEditReleaseDateTime();

    if (editReleaseMode === "NOW" && !normalizedEditReleaseDateTime) {
      setEditError("Please choose a release date and time, or select Set Date Later.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: editTitle.trim(),
        content: editContent.trim(),
        releaseDate: editReleaseMode === "NOW" ? normalizedEditReleaseDateTime : null,
      };

      const res = await fetch(`/api/memory-sent/${memory.id}/items/${editingItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setEditError(json?.error ?? "Failed to update item.");
        return;
      }

      await loadMemory();
      cancelEdit();
    } catch {
      setEditError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMemory() {
    if (!memory) return;

    if (isLocked) {
      setPageError("This memory is locked. You cannot delete after any message is released.");
      return;
    }

    const ok = window.confirm("Delete this whole memory? This will delete all items inside.");
    if (!ok) return;

    setDeleting(true);
    setPageError("");

    try {
      const res = await fetch(`/api/memory-sent/${memory.id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) {
        setPageError(json?.error ?? "Failed to delete memory.");
        return;
      }

      router.push("/memory-sent");
    } catch {
      setPageError("Network error.");
    } finally {
      setDeleting(false);
    }
  }

  async function deleteAttachment(itemId: string, attachmentId: string) {
    if (!memory) return;

    setAttachmentError("");

    if (isLocked) {
      setAttachmentError("This memory is locked. You cannot delete attachments after release.");
      return;
    }

    const ok = window.confirm("Delete this attachment?");
    if (!ok) return;

    setDeletingAttachmentId(attachmentId);

    try {
      const res = await fetch(
        `/api/memory-sent/${memory.id}/attachments/${attachmentId}?itemId=${encodeURIComponent(itemId)}`,
        {
          method: "DELETE",
        }
      );

      const json = await res.json();

      if (!res.ok) {
        setAttachmentError(json?.error ?? "Failed to delete attachment.");
        return;
      }

      await loadMemory();
    } catch {
      setAttachmentError("Network error while deleting attachment.");
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  if (status === "loading" || loading) {
    return <div style={{ padding: 20 }}>Loading memory...</div>;
  }

  if (!memory) {
    return (
      <div style={{ padding: 20 }}>
        <h2 style={{ fontWeight: 900 }}>Memory Details</h2>
        {pageError && <div style={{ color: "red", marginTop: 10 }}>{pageError}</div>}
        <button style={{ marginTop: 14 }} onClick={() => router.push("/memory-sent")}>
          Back to Memory Sent
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Memory Details</h1>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/memory-sent")}>Back</button>

          <button onClick={deleteMemory} disabled={deleting || isLocked}>
            {deleting ? "Deleting..." : "Delete Memory"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{memory.title}</div>

        <div style={{ marginTop: 6, color: "#666" }}>
          Status: <b>{memory.status}</b>
        </div>

        <div style={{ marginTop: 6, color: "#666" }}>
          Created: <b>{formatSingaporeDateTime(memory.createdAt)} (SGT)</b>
        </div>

        {isLocked && (
          <div style={{ marginTop: 10, color: "red", fontWeight: 800 }}>
            This memory is locked because at least one message has already been released.
          </div>
        )}

        {/* ── Emergency recall button ── */}
        {/* Only show when memory has released items within 24 hours */}
        {(() => {
          const releasedItems = memory.items.filter(
            (i) => i.status === "RELEASED" && i.releasedAt
          );
          if (releasedItems.length === 0) return null;

          const earliestRelease = releasedItems.reduce((earliest, item) => {
            if (!item.releasedAt) return earliest;
            const d = new Date(item.releasedAt);
            return !earliest || d < earliest ? d : earliest;
          }, null as Date | null);

          if (!earliestRelease) return null;

          const hoursSince =
            (Date.now() - earliestRelease.getTime()) / (1000 * 60 * 60);

          if (hoursSince > 24) return null;

          const hoursLeft = Math.max(0, 24 - Math.floor(hoursSince));

          return (
            <div style={{
              marginTop: 12,
              padding: "12px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
            }}>
              <div style={{ fontWeight: 700, color: "#991b1b", fontSize: 13 }}>
                Emergency recall available — {hoursLeft} hour{hoursLeft !== 1 ? "s" : ""} remaining
              </div>
              <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
                This memory was recently released. You can recall it within 24 hours
                if the receiver has not yet claimed it.
              </div>

              {recallError && (
                <div style={{ color: "#991b1b", fontSize: 12, marginTop: 8 }}>
                  {recallError}
                </div>
              )}

              {recallInfo && (
                <div style={{ color: "#166534", fontSize: 12, marginTop: 8 }}>
                  {recallInfo}
                </div>
              )}

              <button
                onClick={recallMemory}
                disabled={recalling}
                style={{
                  marginTop: 10,
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {recalling ? "Recalling..." : "Emergency recall"}
              </button>
            </div>
          );
        })()}

        {pageError && <div style={{ marginTop: 10, color: "red" }}>{pageError}</div>}
        {attachmentError && <div style={{ marginTop: 10, color: "red" }}>{attachmentError}</div>}
      </div>

      <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Receiver</div>
        <div style={{ marginTop: 8 }}>
          Name: <b>{memory.receiver.fullName}</b>
        </div>
        <div>
          Email: <b>{memory.receiver.email}</b>
        </div>
        <div>
          Phone: <b>{memory.receiver.phone}</b>
        </div>
        <div>
          Address: <b>{memory.receiver.address}</b>
        </div>
        <div>
          ID No: <b>{memory.receiver.identificationNo}</b>
        </div>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Items ({memory.items.length})</div>

        {memory.items.length === 0 ? (
          <div style={{ marginTop: 8, color: "#666" }}>No items yet.</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {memory.items.map((item) => {
              const isEditing = editingItemId === item.id;
              const attachments = item.attachments ?? [];
              const attachmentCount = item.attachmentCount ?? attachments.length;

              return (
                <div
                  key={item.id}
                  style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}
                >
                  {!isEditing ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900 }}>{item.title}</div>
                        <div style={{ color: "#666" }}>
                          {attachmentCount > 0
                            ? `${attachmentCount} attachment${attachmentCount > 1 ? "s" : ""}`
                            : "Text only"}
                        </div>
                      </div>

                      <div style={{ marginTop: 6, color: "#666" }}>
                        Status: <b>{item.status}</b>
                      </div>

                      <div style={{ marginTop: 6, color: "#666" }}>
                        Release rule:{" "}
                        <b>
                          {item.releaseDate
                            ? `${formatSingaporeDateTime(item.releaseDate)} (SGT)`
                            : "Proof-of-life (miss 6 times)"}
                        </b>
                      </div>

                      <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{item.content}</div>

                      {attachments.length > 0 && (
                        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                          <div style={{ fontWeight: 800 }}>Attachments</div>

                          {attachments.map((att) => {
                            const isDeletingThisAttachment = deletingAttachmentId === att.id;
                            const imageUrl =
                              att.type === "IMAGE"
                                ? getOptimizedImageUrl(att.mediaUrl, att.mediaPublicId, {
                                    width: 1200,
                                  })
                                : null;
                            const videoUrl =
                              att.type === "VIDEO"
                                ? getOptimizedVideoUrl(att.mediaUrl, att.mediaPublicId, {
                                    width: 1280,
                                  })
                                : null;

                            return (
                              <div
                                key={att.id}
                                style={{
                                  border: "1px solid #f0f0f0",
                                  borderRadius: 10,
                                  padding: 10,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 10,
                                    alignItems: "center",
                                    marginBottom: 8,
                                  }}
                                >
                                  <div style={{ fontSize: 12, color: "#666" }}>
                                    <b>{att.type}</b>
                                    {att.mediaFileName ? ` • ${att.mediaFileName}` : ""}
                                  </div>

                                  {!isLocked && (
                                    <button
                                      type="button"
                                      onClick={() => deleteAttachment(item.id, att.id)}
                                      disabled={isDeletingThisAttachment}
                                    >
                                      {isDeletingThisAttachment ? "Deleting..." : "Delete Attachment"}
                                    </button>
                                  )}
                                </div>

                                {att.type === "IMAGE" && imageUrl && (
                                  <img
                                    src={imageUrl}
                                    alt={att.mediaFileName ?? item.title}
                                    style={{
                                      maxWidth: "100%",
                                      maxHeight: 360,
                                      borderRadius: 10,
                                      border: "1px solid #ddd",
                                    }}
                                  />
                                )}

                                {att.type === "VIDEO" && videoUrl && (
                                  <video
                                    controls
                                    preload="metadata"
                                    style={{
                                      width: "100%",
                                      maxHeight: 420,
                                      borderRadius: 10,
                                      border: "1px solid #ddd",
                                    }}
                                    src={videoUrl}
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div style={{ marginTop: 12 }}>
                        <button onClick={() => startEdit(item)} disabled={isLocked}>
                          {item.releaseDate ? "Edit" : "Set Release Date / Edit"}
                        </button>
                        {isLocked && (
                          <span style={{ marginLeft: 10, color: "red", fontSize: 12 }}>
                            Locked
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 900, marginBottom: 8 }}>Edit Item</div>

                      <div style={{ display: "grid", gap: 8 }}>
                        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />

                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={5}
                        />

                        {attachments.length > 0 && (
                          <div style={{ marginTop: 4, display: "grid", gap: 10 }}>
                            <div style={{ fontWeight: 800 }}>Current Attachments</div>

                            {attachments.map((att) => {
                              const isDeletingThisAttachment = deletingAttachmentId === att.id;
                              const imageUrl =
                                att.type === "IMAGE"
                                  ? getOptimizedImageUrl(att.mediaUrl, att.mediaPublicId, {
                                      width: 900,
                                    })
                                  : null;
                              const videoUrl =
                                att.type === "VIDEO"
                                  ? getOptimizedVideoUrl(att.mediaUrl, att.mediaPublicId, {
                                      width: 960,
                                    })
                                  : null;

                              return (
                                <div
                                  key={att.id}
                                  style={{
                                    border: "1px solid #f0f0f0",
                                    borderRadius: 10,
                                    padding: 10,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      gap: 10,
                                      alignItems: "center",
                                      marginBottom: 8,
                                    }}
                                  >
                                    <div style={{ fontSize: 12, color: "#666" }}>
                                      <b>{att.type}</b>
                                      {att.mediaFileName ? ` • ${att.mediaFileName}` : ""}
                                    </div>

                                    {!isLocked && (
                                      <button
                                        type="button"
                                        onClick={() => deleteAttachment(item.id, att.id)}
                                        disabled={isDeletingThisAttachment}
                                      >
                                        {isDeletingThisAttachment ? "Deleting..." : "Delete Attachment"}
                                      </button>
                                    )}
                                  </div>

                                  {att.type === "IMAGE" && imageUrl && (
                                    <img
                                      src={imageUrl}
                                      alt={att.mediaFileName ?? item.title}
                                      style={{
                                        maxWidth: "100%",
                                        maxHeight: 240,
                                        borderRadius: 10,
                                        border: "1px solid #ddd",
                                      }}
                                    />
                                  )}

                                  {att.type === "VIDEO" && videoUrl && (
                                    <video
                                      controls
                                      preload="metadata"
                                      style={{
                                        width: "100%",
                                        maxHeight: 320,
                                        borderRadius: 10,
                                        border: "1px solid #ddd",
                                      }}
                                      src={videoUrl}
                                    >
                                      Your browser does not support the video tag.
                                    </video>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div style={{ marginTop: 10, border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                          <div style={{ fontWeight: 800, marginBottom: 8 }}>Add New Attachment(s)</div>

                          <input
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            onChange={handleNewEditFilesChange}
                            disabled={addingAttachments || isLocked}
                          />

                          {newEditFileError && (
                            <div style={{ color: "red", marginTop: 8 }}>{newEditFileError}</div>
                          )}

                          {newEditFiles.length > 0 && (
                            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                              <div style={{ fontSize: 12, color: "#666" }}>
                                Selected files ({newEditFiles.length}/{MAX_EDIT_ATTACHMENTS_PER_ADD})
                              </div>

                              {newEditFiles.map((file, index) => {
                                const isImage = file.type.startsWith("image/");
                                const isVideo = file.type.startsWith("video/");

                                return (
                                  <div
                                    key={`${file.name}-${index}`}
                                    style={{
                                      border: "1px solid #f0f0f0",
                                      borderRadius: 8,
                                      padding: 8,
                                      display: "grid",
                                      gap: 6,
                                    }}
                                  >
                                    <div style={{ fontSize: 12 }}>
                                      <b>{file.name}</b>
                                    </div>

                                    <div style={{ fontSize: 11, color: "#666" }}>
                                      Type: {isImage ? "IMAGE" : isVideo ? "VIDEO" : "UNKNOWN"} | Size:{" "}
                                      {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </div>

                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => removeNewEditFile(index)}
                                        disabled={addingAttachments}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}

                              <div>
                                <button
                                  type="button"
                                  onClick={() => addAttachmentsToItem(item.id)}
                                  disabled={addingAttachments || isLocked}
                                >
                                  {addingAttachments ? "Uploading..." : "Add Attachment(s)"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ fontSize: 12, color: "#666" }}>
                          Release Time (Singapore Time)
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 16,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input
                              type="radio"
                              name={`editReleaseMode-${item.id}`}
                              checked={editReleaseMode === "LATER"}
                              onChange={() => {
                                setEditReleaseMode("LATER");
                                resetEditReleaseInputs();
                              }}
                            />
                            Set Date Later
                          </label>

                          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input
                              type="radio"
                              name={`editReleaseMode-${item.id}`}
                              checked={editReleaseMode === "NOW"}
                              onChange={() => setEditReleaseMode("NOW")}
                            />
                            Set Release Date Now
                          </label>
                        </div>

                        {editReleaseMode === "NOW" && (
                          <div style={{ display: "grid", gap: 10 }}>
                            <input
                              type="date"
                              value={editReleaseDateOnly}
                              onChange={(e) => {
                                setEditReleaseDateOnly(e.target.value);
                                setEditError("");
                              }}
                            />

                            <input
                              type="time"
                              value={editReleaseTimeOnly}
                              step={60}
                              onChange={(e) => {
                                setEditReleaseTimeOnly(e.target.value);
                                setEditError("");
                              }}
                            />
                          </div>
                        )}

                        <div style={{ color: "#666", fontSize: 12 }}>
                          {editReleaseMode === "LATER"
                            ? "No release date will be saved now. You can add it later."
                            : "Choose the Singapore date and time for release."}
                        </div>
                      </div>

                      {editError && (
                        <div style={{ color: "red", marginTop: 10 }}>{editError}</div>
                      )}

                      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                        <button onClick={saveEdit} disabled={saving || isLocked || addingAttachments}>
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button onClick={cancelEdit} disabled={saving || addingAttachments}>
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}