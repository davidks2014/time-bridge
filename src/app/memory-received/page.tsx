"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { formatSingaporeDateTime } from "@/lib/sg-time";

type ReceivedItem = {
  id: string;
  type: "TEXT" | "IMAGE" | "VIDEO";
  title: string;
  content: string | null;

  // New shared media fields
  mediaUrl: string | null;
  mediaPublicId: string | null;
  mediaFileName: string | null;
  mediaMimeType: string | null;

  releaseDate: string | null;
  status: "DRAFT" | "RELEASED";
  releasedAt: string | null;
  sender: { name: string | null; email: string };
  memory: { id: string; title: string };
};

export default function MemoryReceivedPage() {
  const router = useRouter();
  const { status } = useSession();

  const [items, setItems] = useState<ReceivedItem[]>([]);
  const [receivedCount, setReceivedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      setReceivedCount(json.receivedCount ?? 0);
      setItems(json.items ?? []);
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
                  Type: <b>{i.type}</b>
                </div>

                <div style={{ marginTop: 6, color: "#555" }}>
                  From: <b>{senderLabel}</b>
                  {i.sender?.email ? <span style={{ color: "#777" }}> ({i.sender.email})</span> : null}
                </div>

                <div style={{ marginTop: 6, color: "#555" }}>
                  Released on: <b>{releasedOn}</b>
                </div>

                <div style={{ marginTop: 10 }}>
                  {i.type === "TEXT" && (
                    <div style={{ whiteSpace: "pre-wrap" }}>{i.content ?? ""}</div>
                  )}

                  {i.type === "IMAGE" && (
                    <>
                      {i.mediaUrl ? (
                        <div>
                          <img
                            src={i.mediaUrl}
                            alt={i.title}
                            style={{
                              maxWidth: "100%",
                              maxHeight: 360,
                              borderRadius: 10,
                              border: "1px solid #ddd",
                            }}
                          />

                          {i.mediaFileName && (
                            <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
                              File: <b>{i.mediaFileName}</b>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>Image not uploaded.</div>
                      )}
                    </>
                  )}

                  {i.type === "VIDEO" && (
                    <>
                      {i.mediaUrl ? (
                        <div>
                          <video
                            controls
                            style={{
                              width: "100%",
                              maxHeight: 420,
                              borderRadius: 10,
                              border: "1px solid #ddd",
                            }}
                            src={i.mediaUrl}
                          >
                            Your browser does not support the video tag.
                          </video>

                          {i.mediaFileName && (
                            <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
                              File: <b>{i.mediaFileName}</b>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>Video not uploaded.</div>
                      )}
                    </>
                  )}
                </div>

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