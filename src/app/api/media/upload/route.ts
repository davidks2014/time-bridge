// src/app/api/media/upload/route.ts
import cloudinary from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

function inferResourceType(itemType: string): "image" | "video" {
  return itemType === "VIDEO" ? "video" : "image";
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const itemType = String(form.get("itemType") ?? "IMAGE").toUpperCase().trim();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "file is required." }, { status: 400 });
    }

    if (itemType !== "IMAGE" && itemType !== "VIDEO") {
      return Response.json(
        { error: "itemType must be IMAGE or VIDEO." },
        { status: 400 }
      );
    }

    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    const allowedVideoTypes = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/mpeg"];

    if (itemType === "IMAGE" && !allowedImageTypes.includes(file.type)) {
      return Response.json(
        { error: "Only JPG/PNG/WebP/HEIC images are allowed." },
        { status: 400 }
      );
    }

    if (itemType === "VIDEO" && !allowedVideoTypes.includes(file.type)) {
      return Response.json(
        { error: "Only MP4/MOV/WebM/AVI/MPEG videos are allowed." },
        { status: 400 }
      );
    }

    const maxBytes = itemType === "IMAGE" ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxBytes) {
      return Response.json(
        {
          error:
            itemType === "IMAGE"
              ? "Image file too large. Max 10MB."
              : "Video file too large. Max 100MB.",
        },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const resourceType = inferResourceType(itemType);

    const folder =
      itemType === "VIDEO"
        ? "time-bridge/memories/videos"
        : "time-bridge/memories/images";

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
            reject(new Error("Cloudinary upload failed."));
            return;
          }

          resolve(uploadResult);
        }
      );

      upload.end(bytes);
    });

    return Response.json({
      message: "Media uploaded successfully.",
      mediaUrl: result.secure_url,
      mediaPublicId: result.public_id,
      mediaFileName: file.name ?? null,
      mediaMimeType: file.type ?? null,
      bytes: result.bytes ?? file.size,
      resourceType: result.resource_type ?? resourceType,
    });
  } catch (err) {
    console.error("POST /api/media/upload error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}