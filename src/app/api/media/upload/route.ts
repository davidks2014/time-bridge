/**
 * API: POST /api/media/upload
 *
 * Purpose: Upload image or video file to Backblaze B2 storage.
 * Returns the B2 CDN URL and file metadata to the frontend.
 * Also increments the user's storage usage (storageUsedMB) in the database.
 *
 * Request: multipart/form-data
 * Fields:
 *   - file: File (required)
 *   - itemType: "IMAGE" | "VIDEO" (required)
 *
 * Response:
 *   - mediaUrl: B2 CDN URL (https://cdn.timebridge.sg/...)
 *   - mediaPublicId: B2 object key (used for deletion)
 *   - mediaFileName: original file name
 *   - mediaMimeType: file MIME type
 *   - mediaSizeMB: file size in MB
 */

import { uploadToB2 } from "@/lib/b2Storage";
import { incrementStorage } from "@/lib/storageTracking";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Allowed file types per item type
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/mpeg",
];

// File size limits
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB

export async function POST(req: Request) {
  try {
    // 1) Require authenticated session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    // 2) Get user from DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });
    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 3) Parse multipart form
    const form = await req.formData();
    const file = form.get("file");
    const itemType = String(form.get("itemType") ?? "").toUpperCase();

    if (!(file instanceof File)) {
      return Response.json({ error: "file is required." }, { status: 400 });
    }

    if (itemType !== "IMAGE" && itemType !== "VIDEO") {
      return Response.json(
        { error: "itemType must be IMAGE or VIDEO." },
        { status: 400 }
      );
    }

    // 4) Validate file type and size
    if (itemType === "IMAGE") {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return Response.json(
          { error: "Only JPG/PNG/WebP/HEIC images are allowed." },
          { status: 400 }
        );
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return Response.json(
          { error: "Image too large. Max 10MB." },
          { status: 400 }
        );
      }
    }

    if (itemType === "VIDEO") {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        return Response.json(
          { error: "Only MP4/MOV/WebM/AVI/MPEG videos are allowed." },
          { status: 400 }
        );
      }
      if (file.size > MAX_VIDEO_BYTES) {
        return Response.json(
          { error: "Video too large. Max 100MB." },
          { status: 400 }
        );
      }
    }

    // 5) Convert file to buffer and calculate size in MB
    const buffer = Buffer.from(await file.arrayBuffer());
    const sizeMB = buffer.length / (1024 * 1024);

    // 6) Upload to B2 — images go to memories/images, videos to memories/videos
    const folder = itemType === "VIDEO" ? "memories/videos" : "memories/images";
    const { url, key } = await uploadToB2(buffer, file.name, file.type, folder);

    // 7) Increment user storage usage in MB
    await incrementStorage(user.id, sizeMB);

    // 8) Return file metadata to frontend for saving as attachment
    return Response.json({
      message: "Media uploaded successfully.",
      itemType,
      mediaUrl: url,           // B2 CDN URL for display
      mediaPublicId: key,      // B2 object key for future deletion
      mediaFileName: file.name ?? null,
      mediaMimeType: file.type ?? null,
      mediaSizeMB: sizeMB,
      originalFileSize: file.size,
    });
  } catch (err) {
    console.error("POST /api/media/upload error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
