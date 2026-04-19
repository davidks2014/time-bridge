// src/app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { formatSingaporeDateTime } from "@/lib/sg-time";

const MAX_FILES = 5;
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 100;

type MismatchReceiver = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  identificationNo: string;
  linkedUserId: string | null;
};

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

  const [receiverName, setReceiverName] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [receiverIdNo, setReceiverIdNo] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [mismatchReceiver, setMismatchReceiver] = useState<MismatchReceiver | null>(null);

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
    try {
      const role = (session?.user as any)?.role as MeUser["role"] | undefined;
      if (role === "ADMIN") return;

      const res = await fetch("/api/me");
      const json = await res.json();
      if (!res.ok) return;

      const u = json.user as MeUser & { identificationNo?: string; phoneNumber?: string; address?: string };

      // If profile is incomplete (no NRIC yet) — redirect to complete profile
      // This handles Google users who signed up but have not filled in their details
      if (!u?.identificationNo || !u?.phoneNumber || !u?.address) {
        router.push("/complete-profile");
        return;
      }

      // If profile is complete but verification is pending — show pending page
      if (u?.verificationStatus && u.verificationStatus === "PENDING") {
        router.push("/pending-verification");
        return;
      }

      // If rejected — also show pending page where they can resubmit
      if (u?.verificationStatus && u.verificationStatus === "REJECTED") {
        router.push("/pending-verification");
        return;
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const selectedFileNames = useMemo(() => {
    return selectedFiles.map((file) => file.name);
  }, [selectedFiles]);

  function clearMismatch() {
    setMismatchReceiver(null);
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

    setReceiverName("");
    setReceiverEmail("");
    setReceiverPhone("");
    setReceiverAddress("");
    setReceiverIdNo("");

    setError("");
    setInfo("");
    clearMismatch();
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
    clearMismatch();

    if (!collectionTitle.trim()) return setError("Memory title is required.");
    if (!itemTitle.trim()) return setError("Message title is required.");
    if (!itemContent.trim()) return setError("Message content is required.");

    if (!receiverIdNo.trim()) return setError("Receiver identification number is required.");
    if (!receiverName.trim()) return setError("Receiver name is required.");
    if (!receiverAddress.trim()) return setError("Receiver address is required.");

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
          newReceiver: {
            fullName: receiverName.trim(),
            email: receiverEmail.trim(),
            phone: receiverPhone.trim(),
            address: receiverAddress.trim(),
            identificationNo: receiverIdNo.trim(),
          },
        }),
      });

      const json = await res.json();

      if (res.status === 409 && json?.error === "RECEIVER_EMAIL_MISMATCH") {
        setMismatchReceiver(json.receiver as MismatchReceiver);
        setError("");
        setInfo("");
        return;
      }

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

  function useExistingEmail() {
    if (!mismatchReceiver) return;
    setReceiverEmail(mismatchReceiver.email);
    setInfo("Email updated to the existing receiver email. Click Create Memory again.");
  }

  function cancelMismatch() {
    clearMismatch();
    setInfo("");
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

      {/* Profile incomplete banner — shown when user has not completed NRIC verification */}
      {/* This guides users to complete their profile before creating memories */}
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

      <h1 style={{ fontSize: 26, fontWeight: 800 }}>Dashboard</h1>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close Create Memory" : "+ Create Memory"}
        </button>

        <button onClick={() => router.push("/receivers")}>Receivers</button>

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

            <div style={{ fontWeight: 800, marginTop: 8 }}>Receiver (mandatory)</div>

            <input
              placeholder="Receiver identification number *"
              value={receiverIdNo}
              onChange={(e) => {
                setReceiverIdNo(e.target.value);
                clearMismatch();
              }}
            />

            <input
              placeholder="Receiver full name *"
              value={receiverName}
              onChange={(e) => {
                setReceiverName(e.target.value);
                clearMismatch();
              }}
            />

            <input
              placeholder="Receiver email (optional — required for digital delivery)"
              value={receiverEmail}
              onChange={(e) => {
                setReceiverEmail(e.target.value);
                clearMismatch();
              }}
            />

            {/* Warning shown when email is empty — guides sender to complete guardian details */}
            {!receiverEmail.trim() && (
              <div style={{
                padding: "8px 12px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 8,
                color: "#92400e",
                fontSize: 12,
                lineHeight: 1.6,
              }}>
                No email entered — this memory can only be delivered via guardian
                or physical visit. Please make sure your guardian details are complete.
              </div>
            )}

            <input
              placeholder="Receiver phone (optional)"
              value={receiverPhone}
              onChange={(e) => {
                setReceiverPhone(e.target.value);
                clearMismatch();
              }}
            />

            <input
              placeholder="Receiver address *"
              value={receiverAddress}
              onChange={(e) => {
                setReceiverAddress(e.target.value);
                clearMismatch();
              }}
            />

            {mismatchReceiver && (
              <div
                style={{
                  marginTop: 10,
                  border: "1px solid #f2c94c",
                  background: "#fff8db",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 900 }}>Receiver email mismatch</div>

                <div style={{ marginTop: 6 }}>
                  Identification number matched an existing receiver:
                </div>

                <div style={{ marginTop: 6 }}>
                  Name: <b>{mismatchReceiver.fullName}</b>
                </div>

                <div style={{ marginTop: 6 }}>
                  Existing email in system: <b>{mismatchReceiver.email}</b>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                  <button type="button" onClick={useExistingEmail}>
                    Use existing email
                  </button>
                  <button type="button" onClick={cancelMismatch}>
                    Cancel
                  </button>
                </div>

                <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
                  Tip: Click “Use existing email”, then click “Create Memory” again.
                </div>
              </div>
            )}

            {error && <div style={{ color: "red" }}>{error}</div>}
            {info && <div style={{ color: "green" }}>{info}</div>}

            <button onClick={createMemory} disabled={loading || uploadingMedia}>
              {loading ? "Creating..." : uploadingMedia ? "Uploading attachments..." : "Create Memory"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}