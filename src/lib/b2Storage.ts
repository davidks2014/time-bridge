/**
 * Storage Service — Cloudflare R2
 *
 * Purpose: All file upload, delete and URL generation for Time Bridge.
 * Uses Cloudflare R2 (Singapore APAC) via S3-compatible API.
 * Files are served via cdn.timebridge.sg (Cloudflare CDN).
 *
 * Environment variables required:
 * - R2_ACCESS_KEY_ID
 * - R2_SECRET_ACCESS_KEY
 * - R2_BUCKET_NAME
 * - R2_ENDPOINT
 * - NEXT_PUBLIC_CDN_URL (https://cdn.timebridge.sg)
 *
 * Function names retain the "B2" prefix for backwards compatibility
 * with existing imports across the codebase.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Explicit fallback ensures presigned URLs never point to amazonaws.com
const R2_ENDPOINT =
  process.env.R2_ENDPOINT ??
  "https://e0e1957c4f7b76e22375a904ca0cc1bd.r2.cloudflarestorage.com";

// R2 S3-compatible client — region must be 'auto' for Cloudflare R2
// forcePathStyle generates /{bucket}/{key} presigned URLs matching R2's endpoint format
const s3 = new S3Client({
  endpoint: R2_ENDPOINT,
  region: "auto",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET  = process.env.R2_BUCKET_NAME ?? "timebridge-memories";
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL ?? "https://cdn.timebridge.sg";

/**
 * Upload a file buffer to R2.
 * @param file        - Raw file buffer
 * @param fileName    - Original filename (used to build the object key)
 * @param contentType - MIME type of the file
 * @param folder      - Destination folder inside the bucket (e.g. "memories/images")
 * @returns { url: CDN URL for display, key: R2 object key for future deletion }
 */
export async function uploadToB2(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = "memories"
): Promise<{ url: string; key: string }> {
  const key = `${folder}/${Date.now()}-${fileName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  return { url: `${CDN_URL}/${key}`, key };
}

/**
 * Generate a presigned PUT URL for direct browser-to-R2 upload.
 * The browser uses this URL to PUT the file without going through the server.
 * @param key         - Full R2 object key (including folder prefix)
 * @param contentType - MIME type to enforce on the upload
 * @param expiresIn   - URL validity in seconds (default: 1 hour)
 * @returns Presigned upload URL string pointing to the R2 endpoint
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const signedUrl = await getSignedUrl(s3, command, { expiresIn });

  // R2 custom domain (cdn.timebridge.sg) is read-only — presigned PUT uploads
  // must target the direct R2 S3 endpoint. Correct any amazonaws.com fallback.
  return signedUrl.replace(/https:\/\/[^/]*amazonaws\.com/, R2_ENDPOINT);
}

/**
 * Delete a file from R2 by its full CDN URL.
 * Strips the CDN prefix to derive the object key.
 * @param fileUrl - Full CDN URL (https://cdn.timebridge.sg/...)
 */
export async function deleteFromB2(fileUrl: string): Promise<void> {
  try {
    const key = fileUrl.replace(`${CDN_URL}/`, "");
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (error) {
    console.error("R2 delete error:", error);
  }
}

/**
 * Delete a file from R2 by its object key.
 * Preferred over deleteFromB2 when the key is already known.
 * @param key - R2 object key (e.g. "memories/images/1234-photo.jpg")
 */
export async function deleteFromB2ByKey(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (error) {
    console.error("R2 delete error:", error);
  }
}

/**
 * Build the public CDN URL for a given R2 object key.
 * @param key - R2 object key
 * @returns Full CDN URL for displaying the file
 */
export function getB2Url(key: string): string {
  return `${CDN_URL}/${key}`;
}
