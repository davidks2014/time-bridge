"use client";

/**
 * Receivers Page
 *
 * Purpose:
 * - List all receivers created by current user
 * - Allow generating invite link
 */

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Receiver = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
};

export default function ReceiversPage() {
  const { status } = useSession();

  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteLinks, setInviteLinks] = useState<Record<string, string>>({});

  // Load receivers
  useEffect(() => {
    async function fetchReceivers() {
      const res = await fetch("/api/receivers");
      const json = await res.json();
      setReceivers(json.receivers || []);
      setLoading(false);
    }

    if (status === "authenticated") {
      fetchReceivers();
    }
  }, [status]);

  async function generateInvite(receiverId: string) {
    const res = await fetch(`/api/receivers/${receiverId}/invite`, {
      method: "POST",
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json?.error || "Failed to generate invite.");
      return;
    }

    setInviteLinks((prev) => ({
      ...prev,
      [receiverId]: json.inviteLink,
    }));
  }

  if (status === "loading" || loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Receivers</h1>

      {receivers.length === 0 && <div>No receivers found.</div>}

      {receivers.map((r) => (
        <div
          key={r.id}
          style={{
            border: "1px solid #ddd",
            padding: 15,
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <div><strong>Name:</strong> {r.fullName}</div>
          <div><strong>Email:</strong> {r.email}</div>
          <div><strong>Phone:</strong> {r.phone}</div>
          <div><strong>Address:</strong> {r.address}</div>

          <button
            style={{ marginTop: 10 }}
            onClick={() => generateInvite(r.id)}
          >
            Generate Invite
          </button>

          {inviteLinks[r.id] && (
            <div style={{ marginTop: 8 }}>
              <div><strong>Invite Link:</strong></div>
              <input
                value={inviteLinks[r.id]}
                readOnly
                style={{ width: "100%" }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}