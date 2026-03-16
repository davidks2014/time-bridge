"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { formatSingaporeDateTime } from "@/lib/sg-time";

type IncomingItem = {
  id: string;
  type: "TEXT" | "VIDEO";
  title: string;
  releaseDate: string | null;
  createdAt: string;
  collection: {
    id: string;
    title: string;
    owner: { email: string; name: string | null };
  };
};

export default function IncomingMemoryPage() {
  const router = useRouter();
  const { status } = useSession();

  const [incomingCount, setIncomingCount] = useState(0);
  const [items, setItems] = useState<IncomingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/incoming-memory");
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed to load incoming memories.");
        return;
      }

      setIncomingCount(json.incomingCount ?? 0);
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
      <h1 style={{ fontSize: 26, fontWeight: 800 }}>Incoming Memory</h1>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button onClick={() => router.push("/dashboard")}>Back</button>
        <button style={{ marginLeft: "auto" }} onClick={() => signOut({ callbackUrl: "/login" })}>
          Logout
        </button>
      </div>

      {error && <div style={{ marginTop: 16, color: "red" }}>{error}</div>}
      {loading && <div style={{ marginTop: 16 }}>Loading...</div>}

      <div style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Incoming Count: {incomingCount}</div>
        <div style={{ marginTop: 6, color: "#666" }}>
          These are memories scheduled for you but not released yet. You cannot view content before release.
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        {items.length === 0 && !loading ? (
          <div style={{ color: "#666" }}>No incoming memory yet.</div>
        ) : (
          items.map((i) => (
            <div key={i.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
              <div style={{ fontWeight: 900 }}>{i.title}</div>
              <div style={{ marginTop: 6, color: "#666" }}>
                From: {i.collection.owner.name ?? i.collection.owner.email}
              </div>
              <div style={{ marginTop: 6 }}>
                Release rule:{" "}
                {i.releaseDate
                  ? `${formatSingaporeDateTime(i.releaseDate)} (SGT)`
                  : "Proof-of-life (miss 6 times)"}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>
                Memory Card: {i.collection.title}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}