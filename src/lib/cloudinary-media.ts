// Media URL helpers — supports both B2 CDN (new) and Cloudinary (existing files)

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL ?? "https://cdn.timebridge.sg";

type DeliveryResourceType = "image" | "video";

type OptimizedImageOptions = {
  width?: number;
  height?: number;
};

type OptimizedVideoOptions = {
  width?: number;
  height?: number;
};

function isB2Url(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith(CDN_URL) || url.includes("backblazeb2.com");
}

function getCloudName(): string | null {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  return cloudName || null;
}

/**
 * Extract Cloudinary public ID from a full Cloudinary delivery URL.
 */
export function extractCloudinaryPublicIdFromUrl(
  mediaUrl: string | null | undefined
): string | null {
  if (!mediaUrl) return null;

  try {
    const url = new URL(mediaUrl);
    const parts = url.pathname.split("/").filter(Boolean);

    const uploadIndex = parts.findIndex((part) => part === "upload");
    if (uploadIndex === -1) return null;

    let publicIdParts = parts.slice(uploadIndex + 1);

    const versionIndex = publicIdParts.findIndex((part) => /^v\d+$/.test(part));
    if (versionIndex !== -1) {
      publicIdParts = publicIdParts.slice(versionIndex + 1);
    }

    if (publicIdParts.length === 0) return null;

    const last = publicIdParts[publicIdParts.length - 1];
    publicIdParts[publicIdParts.length - 1] = last.replace(/\.[^.]+$/, "");

    const publicId = publicIdParts.join("/");
    return publicId || null;
  } catch {
    return null;
  }
}

function buildTransformationString(params: {
  resourceType: DeliveryResourceType;
  width?: number;
  height?: number;
}): string {
  const { width, height } = params;
  const parts: string[] = ["f_auto", "q_auto", "c_limit"];
  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);
  return parts.join(",");
}

function buildOptimizedCloudinaryUrl(params: {
  mediaUrl?: string | null;
  mediaPublicId?: string | null;
  resourceType: DeliveryResourceType;
  width?: number;
  height?: number;
}): string | null {
  const { mediaUrl, mediaPublicId, resourceType, width, height } = params;

  const cloudName = getCloudName();
  const publicId = mediaPublicId || extractCloudinaryPublicIdFromUrl(mediaUrl);

  if (!cloudName || !publicId) {
    return mediaUrl ?? null;
  }

  const transformation = buildTransformationString({ resourceType, width, height });

  return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${transformation}/${publicId}`;
}

export function getOptimizedImageUrl(
  mediaUrl: string | null | undefined,
  mediaPublicId?: string | null,
  options: OptimizedImageOptions = {}
): string | null {
  // B2 CDN URLs are served directly — no transformation layer
  if (isB2Url(mediaUrl)) return mediaUrl ?? null;

  return buildOptimizedCloudinaryUrl({
    mediaUrl,
    mediaPublicId,
    resourceType: "image",
    width: options.width ?? 1200,
    height: options.height,
  });
}

export function getOptimizedVideoUrl(
  mediaUrl: string | null | undefined,
  mediaPublicId?: string | null,
  options: OptimizedVideoOptions = {}
): string | null {
  // B2 CDN URLs are served directly — no transformation layer
  if (isB2Url(mediaUrl)) return mediaUrl ?? null;

  return buildOptimizedCloudinaryUrl({
    mediaUrl,
    mediaPublicId,
    resourceType: "video",
    width: options.width ?? 1280,
    height: options.height,
  });
}
