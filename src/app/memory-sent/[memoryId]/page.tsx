"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatSingaporeDateTime } from "@/lib/sg-time";

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

  const isLocked = useMemo(() => {
    if (!memory) return false;
    return memory.items.some((i) => i.status === "RELEASED");
  }, [memory]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function loadMemory() {
    setPageError("");
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

  function startEdit(item: MemoryItem) {
    setEditError("");

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

        {pageError && <div style={{ marginTop: 10, color: "red" }}>{pageError}</div>}
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

                          {attachments.map((att) => (
                            <div
                              key={att.id}
                              style={{
                                border: "1px solid #f0f0f0",
                                borderRadius: 10,
                                padding: 10,
                              }}
                            >
                              <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                                <b>{att.type}</b>
                                {att.mediaFileName ? ` • ${att.mediaFileName}` : ""}
                              </div>

                              {att.type === "IMAGE" && (
                                <img
                                  src={att.mediaUrl}
                                  alt={att.mediaFileName ?? item.title}
                                  style={{
                                    maxWidth: "100%",
                                    maxHeight: 360,
                                    borderRadius: 10,
                                    border: "1px solid #ddd",
                                  }}
                                />
                              )}

                              {att.type === "VIDEO" && (
                                <video
                                  controls
                                  style={{
                                    width: "100%",
                                    maxHeight: 420,
                                    borderRadius: 10,
                                    border: "1px solid #ddd",
                                  }}
                                  src={att.mediaUrl}
                                >
                                  Your browser does not support the video tag.
                                </video>
                              )}
                            </div>
                          ))}
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

                            {attachments.map((att) => (
                              <div
                                key={att.id}
                                style={{
                                  border: "1px solid #f0f0f0",
                                  borderRadius: 10,
                                  padding: 10,
                                }}
                              >
                                <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                                  <b>{att.type}</b>
                                  {att.mediaFileName ? ` • ${att.mediaFileName}` : ""}
                                </div>

                                {att.type === "IMAGE" && (
                                  <img
                                    src={att.mediaUrl}
                                    alt={att.mediaFileName ?? item.title}
                                    style={{
                                      maxWidth: "100%",
                                      maxHeight: 240,
                                      borderRadius: 10,
                                      border: "1px solid #ddd",
                                    }}
                                  />
                                )}

                                {att.type === "VIDEO" && (
                                  <video
                                    controls
                                    style={{
                                      width: "100%",
                                      maxHeight: 320,
                                      borderRadius: 10,
                                      border: "1px solid #ddd",
                                    }}
                                    src={att.mediaUrl}
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

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
                        <button onClick={saveEdit} disabled={saving || isLocked}>
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button onClick={cancelEdit} disabled={saving}>
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