// src/app/api/media/upload/route.ts
import cloudinary from "@/lib/cloudinary";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/mpeg",
] as const;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB

function inferResourceType(itemType: string): "image" | "video" {
  return itemType === "VIDEO" ? "video" : "image";
}

function normalizeItemType(raw: unknown): "IMAGE" | "VIDEO" {
  const value = String(raw ?? "").trim().toUpperCase();

  if (value === "IMAGE" || value === "VIDEO") {
    return value;
  }

  throw new Error("INVALID_ITEM_TYPE");
}

function validateFile(file: File, itemType: "IMAGE" | "VIDEO") {
  if (!file.name?.trim()) {
    throw new Error("FILE_NAME_REQUIRED");
  }

  if (file.size <= 0) {
    throw new Error("EMPTY_FILE");
  }

  if (itemType === "IMAGE") {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      throw new Error("INVALID_IMAGE_TYPE");
    }

    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error("IMAGE_TOO_LARGE");
    }
  }

  if (itemType === "VIDEO") {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_VIDEO_TYPES)[number])) {
      throw new Error("INVALID_VIDEO_TYPE");
    }

    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error("VIDEO_TOO_LARGE");
    }
  }
}

function mapValidationErrorToResponse(message: string) {
  switch (message) {
    case "INVALID_ITEM_TYPE":
      return Response.json(
        { error: "itemType must be IMAGE or VIDEO." },
        { status: 400 }
      );

    case "FILE_NAME_REQUIRED":
      return Response.json(
        { error: "Uploaded file must have a valid file name." },
        { status: 400 }
      );

    case "EMPTY_FILE":
      return Response.json(
        { error: "Uploaded file is empty." },
        { status: 400 }
      );

    case "INVALID_IMAGE_TYPE":
      return Response.json(
        { error: "Only JPG/PNG/WebP/HEIC images are allowed." },
        { status: 400 }
      );

    case "INVALID_VIDEO_TYPE":
      return Response.json(
        { error: "Only MP4/MOV/WebM/AVI/MPEG videos are allowed." },
        { status: 400 }
      );

    case "IMAGE_TOO_LARGE":
      return Response.json(
        { error: "Image file too large. Max 10MB." },
        { status: 400 }
      );

    case "VIDEO_TOO_LARGE":
      return Response.json(
        { error: "Video file too large. Max 100MB." },
        { status: 400 }
      );

    default:
      return null;
  }
}

export async function POST(req: Request) {
  try {
    // 1) Require authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    // 2) Find user and current quota usage
    const user = await prisma.user.findUnique({
      where: { email: String(session.user.email).trim().toLowerCase() },
      select: {
        id: true,
        storageUsedBytes: true,
        storageLimitBytes: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 3) Read multipart form
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "file is required." }, { status: 400 });
    }

    // 4) Normalize item type
    let itemType: "IMAGE" | "VIDEO";
    try {
      itemType = normalizeItemType(form.get("itemType"));
    } catch (err) {
      const mapped = mapValidationErrorToResponse((err as Error).message);
      if (mapped) return mapped;
      throw err;
    }

    // 5) Validate uploaded file
    try {
      validateFile(file, itemType);
    } catch (err) {
      const mapped = mapValidationErrorToResponse((err as Error).message);
      if (mapped) return mapped;
      throw err;
    }

    // 6) Storage quota check
    const storageUsedBytes = BigInt(user.storageUsedBytes);
    const storageLimitBytes = BigInt(user.storageLimitBytes);
    const incomingFileBytes = BigInt(file.size);
    const nextUsedBytes = storageUsedBytes + incomingFileBytes;

    if (nextUsedBytes > storageLimitBytes) {
      const remainingBytes = storageLimitBytes > storageUsedBytes
        ? storageLimitBytes - storageUsedBytes
        : BigInt(0);

      return Response.json(
        {
          error: "Storage quota exceeded. Please delete some files or upgrade your plan.",
          storage: {
            usedBytes: storageUsedBytes.toString(),
            limitBytes: storageLimitBytes.toString(),
            remainingBytes: remainingBytes.toString(),
            incomingFileBytes: incomingFileBytes.toString(),
          },
        },
        { status: 400 }
      );
    }

    // 7) Convert to buffer
    const bytes = Buffer.from(await file.arrayBuffer());
    const resourceType = inferResourceType(itemType);

    const folder =
      itemType === "VIDEO"
        ? "time-bridge/memories/videos"
        : "time-bridge/memories/images";

    // 8) Upload to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          transformation:
            itemType === "IMAGE"
              ? [{ width: 1600, crop: "limit" }]
              : undefined,
        },
        (error, uploadResult) => {
          if (error) {
            reject(error);
            return;
          }

          if (!uploadResult?.secure_url || !uploadResult?.public_id) {
            reject(new Error("CLOUDINARY_UPLOAD_FAILED"));
            return;
          }

          resolve(uploadResult);
        }
      );

      upload.end(bytes);
    });

    // 9) Return useful metadata
    return Response.json({
      message: "Media uploaded successfully.",
      itemType,
      mediaUrl: result.secure_url,
      mediaPublicId: result.public_id,
      mediaFileName: file.name ?? null,
      mediaMimeType: file.type ?? null,
      bytes: result.bytes ?? file.size,
      resourceType: result.resource_type ?? resourceType,
      originalFileSize: file.size,
      storage: {
        usedBytes: storageUsedBytes.toString(),
        limitBytes: storageLimitBytes.toString(),
        projectedUsedBytes: nextUsedBytes.toString(),
      },
    });
  } catch (err) {
    console.error("POST /api/media/upload error:", err);

    const message = String((err as Error)?.message ?? "");

    if (message === "CLOUDINARY_UPLOAD_FAILED") {
      return Response.json({ error: "Cloudinary upload failed." }, { status: 500 });
    }

    return Response.json({ error: "Server error." }, { status: 500 });
  }
}