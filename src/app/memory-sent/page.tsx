"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { formatSingaporeDateTime } from "@/lib/sg-time";

type ApiItem = {
  id: string;
  type: "TEXT" | "VIDEO";
  title: string;
  releaseDate: string | null;
  status: "DRAFT" | "RELEASED";
  createdAt: string;
};

type ApiReceiver = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  identificationNo: string;
};

type ApiCollection = {
  id: string;
  title: string;
  createdAt: string;
  receiver: ApiReceiver;
  items: ApiItem[];
};

export default function MemorySentPage() {
  const router = useRouter();
  const { status } = useSession();

  const [collections, setCollections] = useState<ApiCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/memory-sent");
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed to load memory-sent.");
        return;
      }

      setCollections(json.collections ?? []);
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
      <h1 style={{ fontSize: 26, fontWeight: 800 }}>Memory Sent</h1>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button onClick={() => router.push("/dashboard")}>Back</button>
        <button onClick={() => router.push("/receivers")}>Manage Receivers</button>

        <button style={{ marginLeft: "auto" }} onClick={() => signOut({ callbackUrl: "/login" })}>
          Logout
        </button>
      </div>

      {error && <div style={{ marginTop: 16, color: "red" }}>{error}</div>}
      {loading && <div style={{ marginTop: 16 }}>Loading...</div>}

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        {collections.length === 0 && !loading ? (
          <div style={{ color: "#666" }}>No memories created yet.</div>
        ) : (
          collections.map((m) => {
            const isLocked = m.items.some((it) => it.status === "RELEASED");

            return (
              <div key={m.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{m.title}</div>

                    <div style={{ marginTop: 6, color: "#555" }}>
                      Receiver: {m.receiver.fullName} ({m.receiver.email})
                    </div>

                    <div style={{ marginTop: 4, fontSize: 12, color: "#777" }}>
                      Phone: {m.receiver.phone} | ID: {m.receiver.identificationNo}
                    </div>

                    {isLocked ? (
                      <div style={{ marginTop: 8, color: "crimson", fontSize: 12, fontWeight: 700 }}>
                        Locked (at least one message already released)
                      </div>
                    ) : (
                      <div style={{ marginTop: 8, color: "green", fontSize: 12, fontWeight: 700 }}>
                        Editable (no released message yet)
                      </div>
                    )}
                  </div>

                  <button onClick={() => router.push(`/memory-sent/${m.id}`)}>Open</button>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  {m.items.length === 0 ? (
                    <div style={{ color: "#666" }}>No items inside yet.</div>
                  ) : (
                    m.items.map((i) => (
                      <div
                        key={i.id}
                        style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}
                      >
                        <div style={{ fontWeight: 800 }}>
                          {i.title}{" "}
                          <span style={{ color: "#666", fontWeight: 500 }}>({i.type})</span>
                        </div>

                        <div style={{ marginTop: 6 }}>
                          Release rule:{" "}
                          {i.releaseDate
                            ? `${formatSingaporeDateTime(i.releaseDate)} (SGT)`
                            : "Proof-of-life (miss 6 times)"}
                        </div>

                        <div style={{ marginTop: 6 }}>
                          Status: {i.status === "RELEASED" ? "Released" : "Scheduled"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}