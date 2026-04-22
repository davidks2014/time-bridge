"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { formatSingaporeDateTime } from "@/lib/sg-time";
import {
  getOptimizedImageUrl,
  getOptimizedVideoUrl,
} from "@/lib/cloudinary-media";

type AttachmentType = "IMAGE" | "VIDEO";

type ReceivedAttachment = {
  id: string;
  type: AttachmentType;
  mediaUrl: string;
  mediaPublicId: string;
  mediaFileName: string | null;
  mediaMimeType: string | null;
  createdAt: string;
};

type ReceivedItem = {
  id: string;
  title: string;
  content: string;
  releaseDate: string | null;
  releasedAt: string | null;
  viewedAt: string | null;
  status: "DRAFT" | "RELEASED";
  createdAt: string;
  updatedAt: string;
  sender: { name: string | null; email: string };
  memory: { id: string; title: string };
  attachments: ReceivedAttachment[];
  attachmentCount: number;
};

function normalizeReceivedItem(raw: any): ReceivedItem {
  return {
    id: String(raw?.id ?? ""),
    title: String(raw?.title ?? ""),
    content: String(raw?.content ?? ""),
    releaseDate: raw?.releaseDate ?? null,
    releasedAt: raw?.releasedAt ?? null,
    viewedAt: raw?.viewedAt ?? null,
    status: (raw?.status ?? "DRAFT") as "DRAFT" | "RELEASED",
    createdAt: String(raw?.createdAt ?? ""),
    updatedAt: String(raw?.updatedAt ?? ""),
    sender: {
      name: raw?.sender?.name ? String(raw.sender.name) : null,
      email: String(raw?.sender?.email ?? ""),
    },
    memory: {
      id: String(raw?.memory?.id ?? ""),
      title: String(raw?.memory?.title ?? ""),
    },
    attachments: Array.isArray(raw?.attachments)
      ? raw.attachments.map((att: any) => ({
          id: String(att?.id ?? ""),
          type: String(att?.type ?? "IMAGE") as AttachmentType,
          mediaUrl: String(att?.mediaUrl ?? ""),
          mediaPublicId: String(att?.mediaPublicId ?? ""),
          mediaFileName: att?.mediaFileName ? String(att.mediaFileName) : null,
          mediaMimeType: att?.mediaMimeType ? String(att.mediaMimeType) : null,
          createdAt: String(att?.createdAt ?? ""),
        }))
      : [],
    attachmentCount: Array.isArray(raw?.attachments)
      ? raw.attachments.length
      : Number(raw?.attachmentCount ?? 0),
  };
}

export default function MemoryReceivedPage() {
  const router = useRouter();
  const { status } = useSession();

  const [items, setItems] = useState<ReceivedItem[]>([]);
  const [receivedCount, setReceivedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [openedItems, setOpenedItems] = useState<Set<string>>(new Set());

  async function markAsViewed(itemId: string) {
    setOpenedItems((prev) => new Set([...prev, itemId]));

    await fetch("/api/memory/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    }).catch(() => {});
  }

  async function downloadAllMemories() {
    setDownloading(true);
    try {
      const res = await fetch("/api/receiver/download");

      if (!res.ok) {
        alert("Failed to download memories. Please try again.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timebridge-memories-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

    } catch {
      alert("Network error. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function load() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/memory-received");
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed to load memory-received.");
        return;
      }

      const normalizedItems = Array.isArray(json.items)
        ? json.items.map(normalizeReceivedItem)
        : [];

      setReceivedCount(json.receivedCount ?? 0);
      setItems(normalizedItems);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status]);

  if (status === "loading") return <div style={{ padding: 20 }}>Checking session...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800 }}>Memory Received</h1>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button onClick={() => router.push("/dashboard")}>Back</button>
        <button style={{ marginLeft: "auto" }} onClick={() => signOut({ callbackUrl: "/login" })}>
          Logout
        </button>
      </div>

      {items.length > 0 && (
        <button
          onClick={downloadAllMemories}
          disabled={downloading}
          style={{ marginTop: 12 }}
        >
          {downloading ? "Preparing download..." : "Download all memories as zip"}
        </button>
      )}

      {error && <div style={{ marginTop: 16, color: "red" }}>{error}</div>}
      {loading && <div style={{ marginTop: 16 }}>Loading...</div>}

      <div style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Received Count: {receivedCount}</div>
        <div style={{ marginTop: 6, color: "#666" }}>
          These are memories released to you. You can view the content now.
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        {items.length === 0 && !loading ? (
          <div style={{ color: "#666" }}>No received memory yet.</div>
        ) : (
          items.map((i) => {
            const senderName = (i.sender?.name ?? "").trim();
            const senderLabel = senderName ? senderName : i.sender?.email ?? "Unknown sender";
            const releasedOn = i.releasedAt
              ? `${formatSingaporeDateTime(i.releasedAt)} (SGT)`
              : "Unknown";

            return (
              <div key={i.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
                <div style={{ fontWeight: 900 }}>{i.title}</div>

                <div style={{ marginTop: 6, color: "#555" }}>
                  From: <b>{senderLabel}</b>
                  {i.sender?.email ? <span style={{ color: "#777" }}> ({i.sender.email})</span> : null}
                </div>

                <div style={{ marginTop: 6, color: "#555" }}>
                  Released on: <b>{releasedOn}</b>
                </div>

                <div style={{ marginTop: 6, color: "#555" }}>
                  Attachments: <b>{i.attachmentCount}</b>
                </div>

                {/* Show content only if receiver has opened it */}
                {i.viewedAt || openedItems.has(i.id) ? (
                  <div>
                    <div style={{
                      marginTop: 12,
                      padding: 14,
                      background: "#f9fafb",
                      borderRadius: 8,
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                      color: "#374151",
                    }}>
                      {i.content}
                    </div>

                    {i.attachments.length > 0 && (
                      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                        <div style={{ fontWeight: 800 }}>Attachments</div>

                        {i.attachments.map((att) => {
                          const imageUrl =
                            att.type === "IMAGE"
                              ? getOptimizedImageUrl(att.mediaUrl, att.mediaPublicId, { width: 1200 })
                              : null;

                          const videoUrl =
                            att.type === "VIDEO"
                              ? getOptimizedVideoUrl(att.mediaUrl, att.mediaPublicId, { width: 1280 })
                              : null;

                          return (
                            <div key={att.id} style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 10 }}>
                              <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                                <b>{att.type}</b>
                                {att.mediaFileName ? ` • ${att.mediaFileName}` : ""}
                              </div>

                              {att.type === "IMAGE" && imageUrl && (
                                <img
                                  src={imageUrl}
                                  alt={att.mediaFileName ?? i.title}
                                  style={{ maxWidth: "100%", maxHeight: 360, borderRadius: 10, border: "1px solid #ddd" }}
                                />
                              )}

                              {att.type === "VIDEO" && videoUrl && (
                                <video
                                  controls
                                  preload="metadata"
                                  style={{ width: "100%", maxHeight: 420, borderRadius: 10, border: "1px solid #ddd" }}
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
                  </div>
                ) : (
                  <div style={{
                    marginTop: 12,
                    padding: 16,
                    background: "#f0fdf8",
                    border: "1px solid #6ee7b7",
                    borderRadius: 10,
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>💌</div>
                    <div style={{ fontWeight: 700, color: "#065f46", marginBottom: 6 }}>
                      A personal message is waiting for you
                    </div>
                    <div style={{ color: "#047857", fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
                      From <b>{i.sender.name ?? "Someone special"}</b>.
                      Take your time — this message will always be here when you are ready.
                    </div>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                      <button
                        onClick={() => markAsViewed(i.id)}
                        style={{
                          background: "#1D9E75",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          padding: "10px 20px",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                      >
                        I am ready — open this message
                      </button>
                      <button
                        onClick={() => router.push("/dashboard")}
                        style={{
                          background: "white",
                          color: "#6b7280",
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          padding: "10px 20px",
                          cursor: "pointer",
                          fontSize: 14,
                        }}
                      >
                        Save for later
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 10, fontSize: 12, color: "#777" }}>
                  Memory Card: {i.memory.title}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}