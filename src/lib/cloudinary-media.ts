/**
 * Media URL Helper
 *
 * Purpose: Return the correct display URL for media files.
 * Since migrating to Cloudflare R2, files are served directly
 * via cdn.timebridge.sg — no transformation needed.
 *
 * These functions are kept for backwards compatibility with pages
 * that import them. Parameters prefixed with _ are intentionally
 * unused — they existed for Cloudinary transformation options.
 */

/**
 * Get the display URL for an image attachment.
 * R2 files are served via Cloudflare CDN — returned as-is.
 */
export function getOptimizedImageUrl(
  mediaUrl: string | null | undefined,
  _mediaPublicId?: string | null,
  _options?: { width?: number; height?: number }
): string | null {
  return mediaUrl ?? null;
}

/**
 * Get the display URL for a video attachment.
 * R2 files are served via Cloudflare CDN — returned as-is.
 */
export function getOptimizedVideoUrl(
  mediaUrl: string | null | undefined,
  _mediaPublicId?: string | null,
  _options?: { width?: number; height?: number }
): string | null {
  return mediaUrl ?? null;
}
