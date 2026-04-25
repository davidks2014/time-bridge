"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TimeBridgeLoading from "@/components/TimeBridgeLoading";

type Attachment = {
  id: string;
  type: "IMAGE" | "VIDEO";
  mediaUrl: string;
  mediaFileName: string | null;
};

type ReceivedItem = {
  id: string;
  title: string;
  content: string;
  status: "DRAFT" | "RELEASED";
  releasedAt: string | null;
  viewedAt: string | null;
  attachments: Attachment[];
  sender: { name: string | null; email: string };
  memory: { id: string; title: string };
};

export default function MemoryReceivedPage() {
  const { status } = useSession();
  const router = useRouter();

  const [items, setItems]       = useState<ReceivedItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [openedItems, setOpenedItems] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") loadItems();
  }, [status]);

  async function loadItems() {
    setLoading(true);
    try {
      const res  = await fetch("/api/memory-received");
      const json = await res.json();
      setItems(json.items ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function markAsViewed(itemId: string) {
    setOpenedItems((prev) => new Set([...prev, itemId]));
    await fetch("/api/memory/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    }).catch(() => {});
  }

  async function downloadAll() {
    setDownloading(true);
    try {
      const res  = await fetch("/api/receiver/download");
      if (!res.ok) { alert("Download failed. Please try again."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `timebridge-memories-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  if (status === "loading" || loading) {
    return <TimeBridgeLoading message="Opening your memories..." />;
  }

  const releasedItems = items.filter((i) => i.status === "RELEASED");

  return (
    <div className="tb-page tb-page-with-tabs">
      <div className="tb-container" style={{ paddingTop: 32, paddingBottom: 48 }}>

        {/* Header */}
        <div className="tb-page-header tb-fade-in">
          <h1>Memories for you</h1>
          <p style={{ color: "var(--earth-muted)", fontSize: 14, marginTop: 6 }}>
            {releasedItems.length} {releasedItems.length === 1 ? "memory has" : "memories have"} been left for you
          </p>
          {releasedItems.length > 0 && (
            <button
              className="tb-btn tb-btn-outline"
              onClick={downloadAll}
              disabled={downloading}
              style={{ marginTop: 14, fontSize: 11, letterSpacing: "0.5px" }}
            >
              {downloading ? "Preparing..." : "⬇ Download all as zip"}
            </button>
          )}
        </div>

        {/* Empty state */}
        {releasedItems.length === 0 && (
          <div className="tb-empty tb-fade-in">
            <div style={{ fontSize: 48, marginBottom: 16 }}>💌</div>
            <div className="tb-empty-title">No memories yet</div>
            <div className="tb-empty-body">
              When someone leaves a memory for you,<br />
              it will appear here — waiting patiently.
            </div>
          </div>
        )}

        {/* Memory items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {releasedItems.map((item, i) => {
            const isOpen = item.viewedAt || openedItems.has(item.id);

            return (
              <div
                key={item.id}
                className="tb-fade-in"
                style={{ animationDelay: `${0.08 * i}s` }}
              >
                {isOpen ? (
                  /* ── Opened memory ── */
                  <div className="tb-card" style={{ padding: 0, overflow: "hidden" }}>

                    {/* Memory header */}
                    <div style={{
                      padding: "20px 24px 16px",
                      background: "var(--gold-pale)",
                      borderBottom: "1px solid var(--border)",
                    }}>
                      <div style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 20,
                        fontWeight: 500,
                        color: "var(--earth)",
                        marginBottom: 6,
                      }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--earth-muted)" }}>
                        From <strong>{item.sender.name ?? item.sender.email}</strong>
                        {item.releasedAt && (
                          <span>
                            <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
                            {new Date(item.releasedAt).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Message content */}
                    <div style={{
                      padding: "24px",
                      fontFamily: "var(--font-display)",
                      fontSize: 17,
                      lineHeight: 1.85,
                      color: "var(--earth)",
                      whiteSpace: "pre-wrap",
                      fontStyle: "italic",
                      fontWeight: 300,
                    }}>
                      {item.content}
                    </div>

                    {/* Attachments */}
                    {item.attachments.length > 0 && (
                      <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
                        <div className="tb-divider-gold" style={{ margin: "0 0 12px" }} />
                        {item.attachments.map((att) => (
                          <div key={att.id} style={{ borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                            {att.type === "IMAGE" ? (
                              <img
                                src={att.mediaUrl}
                                alt={att.mediaFileName ?? "Memory photo"}
                                style={{ width: "100%", display: "block", borderRadius: "var(--radius-md)" }}
                                loading="lazy"
                              />
                            ) : (
                              <video
                                src={att.mediaUrl}
                                controls
                                style={{ width: "100%", borderRadius: "var(--radius-md)" }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Viewed badge */}
                    {item.viewedAt && (
                      <div style={{
                        padding: "10px 24px",
                        borderTop: "1px solid var(--border)",
                        fontSize: 11,
                        color: "var(--earth-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}>
                        <span style={{ color: "var(--sage)" }}>✓</span>
                        Opened {new Date(item.viewedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Unopened memory — ready prompt ── */
                  <div className="tb-envelope-card">

                    {/* Envelope illustration */}
                    <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
                      <svg width="72" height="56" viewBox="0 0 72 56">
                        <rect x="1" y="1" width="70" height="54" rx="5" fill="#F5E8D0" stroke="#C4A060" strokeWidth="1.5"/>
                        <path d="M1 1 L36 30 L71 1" stroke="#8B6914" strokeWidth="1.5" fill="#EDD8B8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M1 55 L26 32" stroke="#C4A060" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
                        <path d="M71 55 L46 32" stroke="#C4A060" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
                        <line x1="16" y1="38" x2="56" y2="38" stroke="#D4B878" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
                        <line x1="16" y1="44" x2="48" y2="44" stroke="#D4B878" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
                        {/* Heart seal */}
                        <path d="M36 52 C36 52 28 47 28 43 C28 41 29.5 39.5 31.5 39.5 C33 39.5 35 41 36 42 C37 41 39 39.5 40.5 39.5 C42.5 39.5 44 41 44 43 C44 47 36 52 36 52Z" fill="#8B6914"/>
                      </svg>
                    </div>

                    <div style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 400,
                      color: "var(--earth)",
                      marginBottom: 8,
                      lineHeight: 1.4,
                    }}>
                      A message has been left for you
                    </div>

                    <div style={{ fontSize: 14, color: "var(--earth-muted)", marginBottom: 6 }}>
                      From <strong style={{ color: "var(--earth-mid)" }}>{item.sender.name ?? item.sender.email}</strong>
                    </div>

                    {item.releasedAt && (
                      <div style={{ fontSize: 12, color: "var(--earth-muted)", marginBottom: 20 }}>
                        {new Date(item.releasedAt).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    )}

                    <p style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 15,
                      fontStyle: "italic",
                      color: "var(--earth-muted)",
                      lineHeight: 1.7,
                      marginBottom: 28,
                      fontWeight: 300,
                    }}>
                      "Take your time. This message will always be here<br />when you are ready."
                    </p>

                    <button
                      className="tb-btn tb-btn-gold tb-btn-full"
                      onClick={() => markAsViewed(item.id)}
                      style={{ marginBottom: 12, fontSize: 13, letterSpacing: "1px" }}
                    >
                      I am ready — open this message
                    </button>

                    <button
                      className="tb-btn tb-btn-outline tb-btn-full"
                      onClick={() => router.push("/dashboard")}
                      style={{ fontSize: 12 }}
                    >
                      Save for later
                    </button>

                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
