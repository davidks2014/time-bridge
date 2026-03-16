"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  formatSingaporeDateTime,
  toSingaporeDateTimeLocalInput,
} from "@/lib/sg-time";

type MemoryItemStatus = "DRAFT" | "RELEASED";
type ItemType = "TEXT" | "VIDEO";

type MemoryItem = {
  id: string;
  type: ItemType;
  title: string;
  content: string | null;
  videoUrl: string | null;
  releaseDate: string | null;
  status: MemoryItemStatus;
  createdAt: string;
  updatedAt: string;
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
  const [editReleaseDate, setEditReleaseDate] = useState("");
  const [editReleaseMode, setEditReleaseMode] = useState<"LATER" | "NOW">("LATER");
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

      setMemory(json.memory);
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
      setEditReleaseMode("NOW");
      setEditReleaseDate(toSingaporeDateTimeLocalInput(item.releaseDate));
    } else {
      setEditReleaseMode("LATER");
      setEditReleaseDate("");
    }
  }

  function cancelEdit() {
    setEditingItemId(null);
    setEditTitle("");
    setEditContent("");
    setEditReleaseDate("");
    setEditReleaseMode("LATER");
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

    if (item.type === "TEXT" && !editContent.trim()) {
      setEditError("Content cannot be empty for TEXT item.");
      return;
    }

    if (editReleaseMode === "NOW" && !editReleaseDate.trim()) {
      setEditError("Please choose a release date and time, or select Set Date Later.");
      return;
    }

    setSaving(true);

    try {
      const payload: {
        title: string;
        content?: string;
        releaseDate: string | null;
      } = {
        title: editTitle.trim(),
        releaseDate:
          editReleaseMode === "NOW" && editReleaseDate.trim()
            ? editReleaseDate.trim()
            : null,
      };

      if (item.type === "TEXT") {
        payload.content = editContent.trim();
      }

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
        <div>Email: <b>{memory.receiver.email}</b></div>
        <div>Phone: <b>{memory.receiver.phone}</b></div>
        <div>Address: <b>{memory.receiver.address}</b></div>
        <div>ID No: <b>{memory.receiver.identificationNo}</b></div>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Items ({memory.items.length})</div>

        {memory.items.length === 0 ? (
          <div style={{ marginTop: 8, color: "#666" }}>No items yet.</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {memory.items.map((item) => {
              const isEditing = editingItemId === item.id;

              return (
                <div
                  key={item.id}
                  style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}
                >
                  {!isEditing ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900 }}>{item.title}</div>
                        <div style={{ color: "#666" }}>{item.type}</div>
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

                      {item.type === "TEXT" && (
                        <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
                          {item.content ?? ""}
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
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />

                        {item.type === "TEXT" && (
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={4}
                          />
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
                                setEditReleaseDate("");
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
                          <input
                            type="datetime-local"
                            value={editReleaseDate}
                            onChange={(e) => setEditReleaseDate(e.target.value)}
                          />
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