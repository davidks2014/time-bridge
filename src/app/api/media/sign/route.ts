import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AllowedItemType = "IMAGE" | "VIDEO";

function normalizeEmail(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

function normalizeItemType(raw: unknown): AllowedItemType {
  const value = String(raw ?? "").trim().toUpperCase();

  if (value === "IMAGE" || value === "VIDEO") {
    return value as AllowedItemType;
  }

  throw new Error("INVALID_ITEM_TYPE");
}

function getFolderByItemType(itemType: AllowedItemType): string {
  return itemType === "VIDEO"
    ? "time-bridge/memories/videos"
    : "time-bridge/memories/images";
}

function getResourceTypeByItemType(itemType: AllowedItemType): "image" | "video" {
  return itemType === "VIDEO" ? "video" : "image";
}

/**
 * POST /api/media/sign
 *
 * Purpose:
 * - Generate a signed Cloudinary upload signature for direct browser upload
 * - User must be logged in
 * - Return folder, timestamp, api key, cloud name, signature, resource type
 *
 * Request body:
 * {
 *   itemType: "IMAGE" | "VIDEO"
 * }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: normalizeEmail(session.user.email),
      },
      select: {
        id: true,
      },
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

    const folder = getFolderByItemType(itemType);
    const resourceType = getResourceTypeByItemType(itemType);
    const timestamp = Math.floor(Date.now() / 1000);

    /**
     * These params will be signed.
     * Keep them aligned with what frontend sends to Cloudinary.
     */
    const paramsToSign: Record<string, string | number> = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET as string
    );

    return Response.json({
      message: "Upload signature generated successfully.",
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      folder,
      resourceType,
      signature,
      itemType,
    });
  } catch (err) {
    console.error("POST /api/media/sign error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}