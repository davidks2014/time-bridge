import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePresignedUploadUrl, getB2Url } from "@/lib/b2Storage";
import crypto from "crypto";

export const dynamic = "force-dynamic";

type AllowedItemType = "IMAGE" | "VIDEO" | "DOCUMENT";

function normalizeEmail(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

function normalizeItemType(raw: unknown): AllowedItemType {
  const value = String(raw ?? "").trim().toUpperCase();
  if (value === "IMAGE" || value === "VIDEO" || value === "DOCUMENT") return value as AllowedItemType;
  throw new Error("INVALID_ITEM_TYPE");
}

function getFolderByItemType(itemType: AllowedItemType): string {
  if (itemType === "VIDEO") return "memories/videos";
  if (itemType === "DOCUMENT") return "documents";
  return "memories/images";
}

/**
 * POST /api/media/sign
 *
 * Returns a presigned B2 PUT URL for direct browser upload.
 *
 * Request body: { itemType: "IMAGE" | "VIDEO", fileName: string, contentType: string }
 * Response: { uploadUrl, cdnUrl, key, itemType }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(session.user.email) },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    let itemType: AllowedItemType;
    try {
      itemType = normalizeItemType(body?.itemType);
    } catch {
      return Response.json(
        { error: "itemType must be IMAGE or VIDEO." },
        { status: 400 }
      );
    }

    const rawFileName = String(body?.fileName ?? "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    const contentType = String(body?.contentType ?? "application/octet-stream");
    const folder = getFolderByItemType(itemType);
    const uniqueId = crypto.randomBytes(8).toString("hex");
    const key = `${folder}/${Date.now()}-${uniqueId}-${rawFileName}`;

    const uploadUrl = await generatePresignedUploadUrl(key, contentType);
    const cdnUrl = getB2Url(key);

    console.log("[media/sign] presigned URL host:", new URL(uploadUrl).hostname);

    return Response.json({
      uploadUrl,
      cdnUrl,
      key,
      itemType,
    });
  } catch (err) {
    console.error("POST /api/media/sign error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
