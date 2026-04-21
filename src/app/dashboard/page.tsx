// src/app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { formatSingaporeDateTime } from "@/lib/sg-time";

const MAX_FILES = 5;
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 100;

type MeUser = {
  role: "USER" | "ADMIN";
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
};

type DashboardSummaryResponse = {
  sentCount: number;
  receivedCount: number;
  incomingCount: number;
  missedConfirmations: number;
  lastConfirmedAt: string | null;
};

type StorageSummaryResponse = {
  storageUsedBytes: string;
  storageLimitBytes: string;
  storageRemainingBytes: string;
  storageUsagePercent: number;
};

type AttachmentType = "IMAGE" | "VIDEO";

type UploadedAttachment = {
  type: AttachmentType;
  mediaUrl: string;
  mediaPublicId: string;
  mediaFileName: string | null;
  mediaMimeType: string | null;
  mediaSizeBytes: number;
};

type UploadErrorPayload = {
  error?: string;
  storage?: {
    usedBytes?: string;
    limitBytes?: string;
    remainingBytes?: string;
    incomingFileBytes?: string;
    projectedUsedBytes?: string;
  };
};

type SignedUploadResponse = {
  message: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  resourceType: "image" | "video";
  signature: string;
  itemType: AttachmentType;
};

type CloudinaryDirectUploadResponse = {
  secure_url: string;
  public_id: string;
  resource_type: string;
  original_filename?: string;
  bytes?: number;
  format?: string;
};

function formatBytesToMB(raw: string): string {
  const bytes = Number(raw || "0");
  const mb = bytes / 1024 / 1024;
  return mb.toFixed(2);
}

function buildQuotaMessage(payload: UploadErrorPayload): string {
  const remainingBytes = String(payload?.storage?.remainingBytes ?? "0");
  const incomingFileBytes = String(payload?.storage?.incomingFileBytes ?? "0");

  return [
    payload?.error || "Storage quota exceeded.",
    `Remaining storage: ${formatBytesToMB(remainingBytes)} MB.`,
    `This upload needs: ${formatBytesToMB(incomingFileBytes)} MB.`,
    "Please delete some attachments before uploading again.",
  ].join(" ");
}

function buildReleaseDateTime(dateOnly: string, timeOnly: string): string | null {
  const datePart = dateOnly.trim();
  const timePart = timeOnly.trim();

  if (!datePart || !timePart) return null;

  return `${datePart}T${timePart}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { status, data: session } = useSession();

  const [sentCount, setSentCount] = useState<number | null>(null);
  const [receivedCount, setReceivedCount] = useState<number | null>(null);
  const [incomingCount, setIncomingCount] = useState<number | null>(null);

  const [storageUsedBytes, setStorageUsedBytes] = useState<string>("0");
  const [storageLimitBytes, setStorageLimitBytes] = useState<string>("0");
  const [storageRemainingBytes, setStorageRemainingBytes] = useState<string>("0");
  const [storageUsagePercent, setStorageUsagePercent] = useState<number>(0);

  const [missedConfirmations, setMissedConfirmations] = useState<number | null>(null);
  const [lastConfirmedAt, setLastConfirmedAt] = useState<string | null>(null);
  const [confirmingProof, setConfirmingProof] = useState(false);

  const [collectionTitle, setCollectionTitle] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [itemContent, setItemContent] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [fileError, setFileError] = useState("");

  const [releaseMode, setReleaseMode] = useState<"LATER" | "NOW">("LATER");
  const [releaseDateOnly, setReleaseDateOnly] = useState("");
  const [releaseTimeOnly, setReleaseTimeOnly] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Multiple receivers — each memory can be sent to multiple people
  // Each receiver gets their own collection (one collection per receiver)
  const [receivers, setReceivers] = useState([{
    idNo: "", name: "", email: "", phone: "", address: "",
    receiverType: "ADULT" as "ADULT" | "CHILD" | "UNKNOWN",
    guardianName: "", guardianNric: "", guardianEmail: "",
    guardianPhone: "", guardianAddress: "",
  }]);

  function updateReceiver(index: number, field: string, value: string) {
    setReceivers((prev) =>
      prev.map((r, i) => i === index ? { ...r, [field]: value } : r)
    );
  }

  function addReceiver() {
    setReceivers((prev) => [...prev, {
      idNo: "", name: "", email: "", phone: "", address: "",
      receiverType: "ADULT" as "ADULT" | "CHILD" | "UNKNOWN",
      guardianName: "", guardianNric: "", guardianEmail: "",
      guardianPhone: "", guardianAddress: "",
    }]);
  }

  function removeReceiver(index: number) {
    if (receivers.length === 1) return;
    setReceivers((prev) => prev.filter((_, i) => i !== index));
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const role = (session?.user as any)?.role as MeUser["role"] | undefined;
    if (role === "ADMIN") {
      router.replace("/admin/verification");
    }
  }, [status, session, router]);

  async function guardVerification() {
    // Guard function now only redirects admins to their panel
    // All other users stay on dashboard regardless of verification status
    // Profile state is shown via banners, not redirects
    try {
      const role = (session?.user as any)?.role as string | undefined;
      if (role === "ADMIN") {
        router.replace("/admin/verification");
      }
    } catch {}
  }

  async function loadSummary() {
    try {
      const res = await fetch("/api/dashboard-summary");
      const json = (await res.json()) as Partial<DashboardSummaryResponse>;
      if (!res.ok) return;

      setSentCount(json.sentCount ?? 0);
      setReceivedCount(json.receivedCount ?? 0);
      setIncomingCount(json.incomingCount ?? 0);
      setMissedConfirmations(json.missedConfirmations ?? 0);
      setLastConfirmedAt(json.lastConfirmedAt ?? null);
    } catch {}
  }

  async function loadStorageSummary() {
    try {
      const res = await fetch("/api/storage-summary");
      const json = (await res.json()) as Partial<StorageSummaryResponse>;
      if (!res.ok) return;

      setStorageUsedBytes(String(json.storageUsedBytes ?? "0"));
      setStorageLimitBytes(String(json.storageLimitBytes ?? "0"));
      setStorageRemainingBytes(String(json.storageRemainingBytes ?? "0"));
      setStorageUsagePercent(Number(json.storageUsagePercent ?? 0));
    } catch {}
  }

  useEffect(() => {
    if (status === "authenticated") {
      guardVerification();
      loadSummary();
      loadStorageSummary();
      // Record device fingerprint — catches both email/password and Google login flows
      fetch("/api/auth/record-device", { method: "POST" }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const selectedFileNames = useMemo(() => {
    return selectedFiles.map((file) => file.name);
  }, [selectedFiles]);

  /**
   * Detects approximate age from Singapore NRIC
   * Format: S/T + 2-digit birth year + 5 digits + checksum letter
   * S prefix = born 1900s, T prefix = born 2000s
   * Returns age in years, or null if NRIC format is unrecognised
   */
  function getAgeFromNric(nric: string): number | null {
    if (!nric || nric.length < 3) return null;

    const prefix = nric[0].toUpperCase();
    const yearDigits = nric.substring(1, 3);
    const yearNum = parseInt(yearDigits, 10);

    if (isNaN(yearNum)) return null;

    let birthYear: number;
    if (prefix === "S") {
      birthYear = 1900 + yearNum;
    } else if (prefix === "T") {
      birthYear = 2000 + yearNum;
    } else {
      // FIN (foreigners) start with F or G — cannot determine age
      return null;
    }

    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
  }

  function resetReleaseInputs() {
    setReleaseDateOnly("");
    setReleaseTimeOnly("");
  }

  function resetAttachmentInputs() {
    setSelectedFiles([]);
    setFileError("");
  }

  function resetMemoryForm() {
    setCollectionTitle("");
    setItemTitle("");
    setItemContent("");
    resetAttachmentInputs();

    setReleaseMode("LATER");
    resetReleaseInputs();

    setReceivers([{
      idNo: "", name: "", email: "", phone: "", address: "",
      receiverType: "ADULT",
      guardianName: "", guardianNric: "", guardianEmail: "",
      guardianPhone: "", guardianAddress: "",
    }]);

    setError("");
    setInfo("");
  }

  function inferAttachmentType(file: File): AttachmentType {
    if (file.type.startsWith("image/")) return "IMAGE";
    if (file.type.startsWith("video/")) return "VIDEO";
    throw new Error(`Unsupported file type: ${file.name}`);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    setFileError("");

    if (!newFiles.length) {
      e.target.value = "";
      return;
    }

    let updated = [...selectedFiles];

    for (const file of newFiles) {
      if (updated.length >= MAX_FILES) {
        setFileError(`Maximum ${MAX_FILES} files allowed.`);
        break;
      }

      const exists = updated.some((f) => f.name === file.name && f.size === file.size);
      if (exists) continue;

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        setFileError("Only image or video files allowed.");
        continue;
      }

      const maxBytes = isImage
        ? MAX_IMAGE_MB * 1024 * 1024
        : MAX_VIDEO_MB * 1024 * 1024;

      if (file.size > maxBytes) {
        setFileError(
          isImage
            ? `Image too large (max ${MAX_IMAGE_MB}MB)`
            : `Video too large (max ${MAX_VIDEO_MB}MB)`
        );
        continue;
      }

      updated.push(file);
    }

    setSelectedFiles(updated);
    setError("");
    setInfo("");
    e.target.value = "";
  }

  async function confirmProofOfLife() {
    setError("");
    setInfo("");
    setConfirmingProof(true);

    try {
      const res = await fetch("/api/proof-of-life/confirm", {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "Failed to confirm proof-of-life.");
        return;
      }

      setInfo("Proof-of-life confirmed successfully.");
      await loadSummary();
    } catch {
      setError("Network error.");
    } finally {
      setConfirmingProof(false);
    }
  }

  async function getSignedUpload(itemType: AttachmentType): Promise<SignedUploadResponse> {
    const res = await fetch("/api/media/sign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ itemType }),
    });

    const json = (await res.json()) as SignedUploadResponse & UploadErrorPayload;

    if (!res.ok) {
      throw new Error(json?.error ?? "Failed to generate upload signature.");
    }

    return json;
  }

  async function uploadDirectToCloudinary(file: File): Promise<UploadedAttachment> {
    const attachmentType = inferAttachmentType(file);

    const signPayload = await getSignedUpload(attachmentType);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signPayload.apiKey);
    formData.append("timestamp", String(signPayload.timestamp));
    formData.append("folder", signPayload.folder);
    formData.append("signature", signPayload.signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${signPayload.cloudName}/${signPayload.resourceType}/upload`;

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    const uploadJson = (await uploadRes.json()) as
      | CloudinaryDirectUploadResponse
      | { error?: { message?: string } };

    if (!uploadRes.ok) {
      const cloudinaryMessage =
        "error" in uploadJson
          ? uploadJson.error?.message
          : "Cloudinary direct upload failed.";

      throw new Error(cloudinaryMessage || "Cloudinary direct upload failed.");
    }

    const successJson = uploadJson as CloudinaryDirectUploadResponse;

    return {
      type: attachmentType,
      mediaUrl: String(successJson.secure_url),
      mediaPublicId: String(successJson.public_id),
      mediaFileName: file.name ?? null,
      mediaMimeType: file.type ?? null,
      mediaSizeBytes: Number(successJson.bytes ?? file.size),
    };
  }

  async function uploadAllAttachments(): Promise<UploadedAttachment[]> {
    if (selectedFiles.length === 0) return [];

    setUploadingMedia(true);

    try {
      const uploaded: UploadedAttachment[] = [];

      for (const file of selectedFiles) {
        const result = await uploadDirectToCloudinary(file);
        uploaded.push(result);
      }

      return uploaded;
    } finally {
      setUploadingMedia(false);
    }
  }

  async function createMemory() {
    setError("");
    setInfo("");

    // Check profile completeness before allowing memory creation
    // This gives a clear friendly message instead of an API error
    const profileComplete = (session?.user as any)?.profileComplete;
    const verificationStatus = (session?.user as any)?.verificationStatus;

    if (profileComplete === false) {
      setError("Please complete your profile before creating memories.");
      setInfo("INCOMPLETE_PROFILE");
      return;
    }

    if (verificationStatus !== "APPROVED") {
      setError("Your account is pending admin verification. You can create memories once your account is approved.");
      return;
    }

    if (!collectionTitle.trim()) return setError("Memory title is required.");
    if (!itemTitle.trim()) return setError("Message title is required.");
    if (!itemContent.trim()) return setError("Message content is required.");

    // Validate all receivers
    for (let i = 0; i < receivers.length; i++) {
      const r = receivers[i];
      const label = receivers.length > 1 ? `Receiver ${i + 1}` : "Receiver";
      if (!r.idNo.trim()) return setError(`${label} NRIC is required.`);
      if (!r.name.trim()) return setError(`${label} name is required.`);
      if (!r.address.trim()) return setError(`${label} address is required.`);
      if (r.receiverType === "CHILD" || r.receiverType === "UNKNOWN") {
        if (!r.guardianName.trim()) return setError(`${label} guardian name is required.`);
        if (!r.guardianEmail.trim()) return setError(`${label} guardian email is required.`);
        if (!r.guardianPhone.trim()) return setError(`${label} guardian phone is required.`);
        if (!r.guardianAddress.trim()) return setError(`${label} guardian address is required.`);
      }
    }

    const normalizedReleaseDateTime = buildReleaseDateTime(releaseDateOnly, releaseTimeOnly);

    if (releaseMode === "NOW" && !normalizedReleaseDateTime) {
      return setError("Please choose a release date and time, or select Set Date Later.");
    }

    if (selectedFiles.length > MAX_FILES) {
      return setError(`Maximum ${MAX_FILES} files allowed.`);
    }

    // Friendly frontend pre-check against remaining quota
    const remainingBytes = Number(storageRemainingBytes || "0");
    const selectedTotalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);

    if (selectedTotalBytes > remainingBytes) {
      return setError(
        [
          "Storage quota exceeded.",
          `Remaining storage: ${formatBytesToMB(storageRemainingBytes)} MB.`,
          `Selected upload size: ${(selectedTotalBytes / 1024 / 1024).toFixed(2)} MB.`,
          "Please delete some attachments before uploading again.",
        ].join(" ")
      );
    }

    setLoading(true);

    try {
      const attachments = await uploadAllAttachments();

      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionTitle,
          itemTitle,
          itemContent: itemContent.trim(),
          attachments,
          releaseDate: releaseMode === "NOW" ? normalizedReleaseDateTime : null,
          receivers: receivers.map((r) => ({
            fullName: r.name.trim(),
            email: r.email.trim() || null,
            phone: r.phone.trim() || null,
            address: r.address.trim(),
            identificationNo: r.idNo.trim(),
            receiverType: r.receiverType,
            guardianName: r.guardianName.trim() || null,
            guardianNric: r.guardianNric.trim() || null,
            guardianEmail: r.guardianEmail.trim() || null,
            guardianPhone: r.guardianPhone.trim() || null,
            guardianAddress: r.guardianAddress.trim() || null,
          })),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 400 && json?.error?.toLowerCase().includes("storage")) {
          const msg = buildQuotaMessage(json as UploadErrorPayload);
          setError(msg);
          await loadStorageSummary();
          return;
        }

        setError(json?.error ?? "Failed to create memory.");
        return;
      }

      setInfo("Memory created successfully. Redirecting to Memory Sent...");
      resetMemoryForm();

      await loadSummary();
      await loadStorageSummary();

      setTimeout(() => {
        router.push("/memory-sent");
      }, 600);
    } catch (e) {
      setError((e as Error)?.message || "Network error.");
      await loadStorageSummary();
    } finally {
      setLoading(false);
    }
  }

  function removeSelectedFile(indexToRemove: number) {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setFileError("");
  }

  if (status === "loading") {
    return <div style={{ padding: 20 }}>Checking session...</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>

      {/* Profile incomplete — user needs to complete their profile */}
      {(session?.user as any)?.profileComplete === false && (
        <div style={{
          padding: "14px 16px",
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 12,
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}>
          <div>
            <div style={{ fontWeight: 700, color: "#92400e", fontSize: 14 }}>
              Complete your profile to start creating memories
            </div>
            <div style={{ color: "#b45309", fontSize: 13, marginTop: 4 }}>
              We need your NRIC and a few details to verify your identity.
              This takes about 2 minutes.
            </div>
          </div>
          <button
            onClick={() => router.push("/complete-profile")}
            style={{
              background: "#d97706",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            Complete profile
          </button>
        </div>
      )}

      {/* Profile complete but pending admin verification */}
      {(session?.user as any)?.profileComplete !== false &&
        (session?.user as any)?.verificationStatus === "PENDING" && (
        <div style={{
          padding: "14px 16px",
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 12,
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}>
          <div>
            <div style={{ fontWeight: 700, color: "#1e40af", fontSize: 14 }}>
              Awaiting admin verification
            </div>
            <div style={{ color: "#1d4ed8", fontSize: 13, marginTop: 4 }}>
              Your profile is complete. Our team is reviewing your identity
              documents and will approve your account within 1 to 2 business days.
            </div>
          </div>
          <div style={{
            background: "#dbeafe",
            color: "#1e40af",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}>
            Under review
          </div>
        </div>
      )}

      <h1 style={{ fontSize: 26, fontWeight: 800 }}>Dashboard</h1>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        {/* Only show create memory button if profile is complete */}
        {(session?.user as any)?.profileComplete !== false ? (
          <button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "Create Memory"}
          </button>
        ) : (
          <button
            onClick={() => router.push("/complete-profile")}
            style={{
              background: "#d97706",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 16px",
              cursor: "pointer",
            }}
          >
            Complete profile to create memories
          </button>
        )}

        <button onClick={() => router.push("/receivers")}>Receivers</button>

        <button onClick={() => router.push("/profile")}>
          Profile & Settings
        </button>

        <button style={{ marginLeft: "auto" }} onClick={() => signOut({ callbackUrl: "/login" })}>
          Logout
        </button>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <div
          style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, cursor: "pointer" }}
          onClick={() => router.push("/memory-sent")}
        >
          <div style={{ fontWeight: 900, fontSize: 16 }}>Memory Sent</div>
          <div style={{ marginTop: 6, color: "#666" }}>
            Count: <b>{sentCount === null ? "..." : sentCount}</b>
          </div>
        </div>

        <div
          style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, cursor: "pointer" }}
          onClick={() => router.push("/memory-received")}
        >
          <div style={{ fontWeight: 900, fontSize: 16 }}>Memory Received</div>
          <div style={{ marginTop: 6, color: "#666" }}>
            Count: <b>{receivedCount === null ? "..." : receivedCount}</b>
          </div>
        </div>

        <div
          style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, cursor: "pointer" }}
          onClick={() => router.push("/incoming-memory")}
        >
          <div style={{ fontWeight: 900, fontSize: 16 }}>Incoming Memory</div>
          <div style={{ marginTop: 6, color: "#666" }}>
            Count: <b>{incomingCount === null ? "..." : incomingCount}</b>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Storage Usage</div>

          <div style={{ marginTop: 6, color: "#666" }}>
            Used: <b>{formatBytesToMB(storageUsedBytes)} MB</b>
          </div>

          <div style={{ marginTop: 6, color: "#666" }}>
            Remaining: <b>{formatBytesToMB(storageRemainingBytes)} MB</b>
          </div>

          <div style={{ marginTop: 6, color: "#666" }}>
            Total Plan: <b>{formatBytesToMB(storageLimitBytes)} MB</b>
          </div>

          <div style={{ marginTop: 10 }}>
            <div
              style={{
                width: "100%",
                height: 12,
                background: "#eee",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(storageUsagePercent, 100)}%`,
                  height: "100%",
                  background: storageUsagePercent >= 90 ? "#d9534f" : "#4a90e2",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
            {storageUsagePercent}% used of your current storage quota.
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Proof-of-Life</div>

          <div style={{ marginTop: 6, color: "#666" }}>
            Last confirmed:{" "}
            <b>
              {lastConfirmedAt
                ? `${formatSingaporeDateTime(lastConfirmedAt)} (SGT)`
                : "Never confirmed yet"}
            </b>
          </div>

          <div style={{ marginTop: 6, color: "#666" }}>
            Missed confirmations: <b>{missedConfirmations === null ? "..." : missedConfirmations}</b>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
            This affects memories that use proof-of-life release rule when no release date is set.
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={confirmProofOfLife} disabled={confirmingProof}>
              {confirmingProof ? "Confirming..." : "I'm Alive / Confirm Proof-of-Life"}
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Create Memory</div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Memory Card</div>
            <input
              placeholder="Memory title *"
              value={collectionTitle}
              onChange={(e) => setCollectionTitle(e.target.value)}
            />

            <div style={{ fontWeight: 800, marginTop: 8 }}>Message Title</div>
            <input
              placeholder="Message title *"
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
            />

            <div style={{ fontWeight: 800, marginTop: 8 }}>Text Message</div>
            <textarea
              placeholder="Write your message here *"
              value={itemContent}
              onChange={(e) => setItemContent(e.target.value)}
              rows={5}
            />

            <div style={{ fontWeight: 800, marginTop: 8 }}>Attachments (Optional)</div>

            <input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} />

            {fileError && <div style={{ color: "red", marginTop: 6 }}>{fileError}</div>}

            {selectedFileNames.length > 0 && (
              <div
                style={{
                  border: "1px solid #eee",
                  borderRadius: 10,
                  padding: 10,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 800 }}>
                  Selected files ({selectedFiles.length}/{MAX_FILES})
                </div>

                {selectedFiles.map((file, index) => {
                  const isImage = file.type.startsWith("image/");
                  const isVideo = file.type.startsWith("video/");

                  return (
                    <div
                      key={`${file.name}-${index}`}
                      style={{
                        border: "1px solid #f0f0f0",
                        borderRadius: 8,
                        padding: 10,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 13 }}>
                        <b>{file.name}</b>
                      </div>

                      <div style={{ color: "#666", fontSize: 12 }}>
                        Type: {isImage ? "IMAGE" : isVideo ? "VIDEO" : "UNKNOWN"} | Size:{" "}
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>

                      <div style={{ fontSize: 11, color: "#999" }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>

                      {isImage && (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          style={{
                            maxWidth: 240,
                            maxHeight: 180,
                            borderRadius: 8,
                            border: "1px solid #ddd",
                          }}
                        />
                      )}

                      {isVideo && (
                        <div style={{ color: "#666", fontSize: 12 }}>
                          Video selected and will upload directly to Cloudinary when you create the memory.
                        </div>
                      )}

                      <div>
                        <button type="button" onClick={() => removeSelectedFile(index)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ color: "#666", fontSize: 12 }}>
              You can attach images and videos together with your text message.
            </div>

            <div style={{ fontWeight: 800, marginTop: 8 }}>Release Time (Singapore Time)</div>

            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="radio"
                  name="releaseMode"
                  checked={releaseMode === "LATER"}
                  onChange={() => {
                    setReleaseMode("LATER");
                    resetReleaseInputs();
                    setError("");
                  }}
                />
                Set Date Later
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="radio"
                  name="releaseMode"
                  checked={releaseMode === "NOW"}
                  onChange={() => {
                    setReleaseMode("NOW");
                    setError("");
                  }}
                />
                Set Release Date Now
              </label>
            </div>

            {releaseMode === "NOW" && (
              <div style={{ display: "grid", gap: 10 }}>
                <input
                  type="date"
                  value={releaseDateOnly}
                  onChange={(e) => {
                    setReleaseDateOnly(e.target.value);
                    setError("");
                  }}
                />

                <input
                  type="time"
                  value={releaseTimeOnly}
                  step={60}
                  onChange={(e) => {
                    setReleaseTimeOnly(e.target.value);
                    setError("");
                  }}
                />
              </div>
            )}

            <div style={{ color: "#666", fontSize: 12 }}>
              {releaseMode === "LATER"
                ? "No release date will be set now. This memory item can later use proof-of-life release until you add a fixed release date."
                : "Choose the Singapore date and time for release."}
            </div>

            {/* ── Receivers section ── */}
            <div style={{ fontWeight: 800, marginTop: 8 }}>
              Receivers ({receivers.length})
            </div>

            {receivers.map((receiver, index) => (
              <div key={index} style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
                marginTop: 8,
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {receivers.length > 1 ? `Receiver ${index + 1}` : "Receiver"}
                  </div>
                  {receivers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeReceiver(index)}
                      style={{
                        background: "none",
                        border: "1px solid #fecaca",
                        color: "#dc2626",
                        borderRadius: 6,
                        padding: "2px 10px",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Receiver type selector */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {(["ADULT", "CHILD", "UNKNOWN"] as const).map((type) => (
                    <label key={type} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                      padding: "6px 12px",
                      border: `1px solid ${receiver.receiverType === type ? "#1D9E75" : "#ddd"}`,
                      borderRadius: 8,
                      background: receiver.receiverType === type ? "#f0fdf8" : "white",
                      fontSize: 12,
                    }}>
                      <input
                        type="radio"
                        name={`receiverType-${index}`}
                        checked={receiver.receiverType === type}
                        onChange={() => updateReceiver(index, "receiverType", type)}
                      />
                      {type === "ADULT" ? "Adult" : type === "CHILD" ? "Child / Minor" : "No contact yet"}
                    </label>
                  ))}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <input
                    placeholder="NRIC / identification number *"
                    value={receiver.idNo}
                    onChange={(e) => updateReceiver(index, "idNo", e.target.value)}
                  />

                  {/* Child age warning */}
                  {(() => {
                    const age = getAgeFromNric(receiver.idNo);
                    if (age === null || age >= 18) return null;
                    return (
                      <div style={{
                        padding: "8px 12px",
                        background: "#f5f3ff",
                        border: "1px solid #c4b5fd",
                        borderRadius: 8,
                        color: "#4c1d95",
                        fontSize: 12,
                      }}>
                        Receiver appears to be approximately {age} years old.
                        {receiver.receiverType !== "CHILD" && (
                          <span
                            style={{ marginLeft: 6, color: "#7c3aed", cursor: "pointer", textDecoration: "underline" }}
                            onClick={() => updateReceiver(index, "receiverType", "CHILD")}
                          >
                            Switch to Child
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  <input
                    placeholder="Full name *"
                    value={receiver.name}
                    onChange={(e) => updateReceiver(index, "name", e.target.value)}
                  />
                  <input
                    placeholder="Address *"
                    value={receiver.address}
                    onChange={(e) => updateReceiver(index, "address", e.target.value)}
                  />
                  <input
                    placeholder={receiver.receiverType === "ADULT" ? "Email (recommended)" : "Email (optional)"}
                    value={receiver.email}
                    onChange={(e) => updateReceiver(index, "email", e.target.value)}
                  />
                  {!receiver.email && (
                    <div style={{
                      padding: "6px 10px",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: 6,
                      color: "#92400e",
                      fontSize: 11,
                    }}>
                      No email — delivery via guardian or admin visit
                    </div>
                  )}
                  <input
                    placeholder="Phone (optional)"
                    value={receiver.phone}
                    onChange={(e) => updateReceiver(index, "phone", e.target.value)}
                  />
                </div>

                {/* Guardian section */}
                {(receiver.receiverType === "CHILD" || receiver.receiverType === "UNKNOWN") && (
                  <div style={{
                    marginTop: 10,
                    padding: 12,
                    background: "#f5f3ff",
                    border: "1px solid #c4b5fd",
                    borderRadius: 10,
                  }}>
                    <div style={{ fontWeight: 700, color: "#4c1d95", fontSize: 13, marginBottom: 8 }}>
                      Guardian details (required)
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <input placeholder="Guardian full name *" value={receiver.guardianName} onChange={(e) => updateReceiver(index, "guardianName", e.target.value)} />
                      <input placeholder="Guardian NRIC *" value={receiver.guardianNric} onChange={(e) => updateReceiver(index, "guardianNric", e.target.value)} />
                      <input placeholder="Guardian email *" value={receiver.guardianEmail} onChange={(e) => updateReceiver(index, "guardianEmail", e.target.value)} />
                      <input placeholder="Guardian phone *" value={receiver.guardianPhone} onChange={(e) => updateReceiver(index, "guardianPhone", e.target.value)} />
                      <input placeholder="Guardian address *" value={receiver.guardianAddress} onChange={(e) => updateReceiver(index, "guardianAddress", e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add another receiver */}
            <button
              type="button"
              onClick={addReceiver}
              style={{
                background: "white",
                border: "1px dashed #1D9E75",
                color: "#1D9E75",
                borderRadius: 8,
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                width: "100%",
                marginTop: 4,
              }}
            >
              + Add another receiver
            </button>

            {error && (
              <div style={{
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                color: "#991b1b",
                fontSize: 13,
              }}>
                {error}
                {/* Show complete profile button when profile is incomplete */}
                {info === "INCOMPLETE_PROFILE" && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      onClick={() => router.push("/complete-profile")}
                      style={{
                        background: "#991b1b",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      Complete profile now
                    </button>
                  </div>
                )}
              </div>
            )}
            {info && info !== "INCOMPLETE_PROFILE" && <div style={{ color: "green" }}>{info}</div>}

            <button onClick={createMemory} disabled={loading || uploadingMedia}>
              {loading ? "Creating..." : uploadingMedia ? "Uploading attachments..." : "Create Memory"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}