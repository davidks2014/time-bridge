/**
 * src/app/api/receiver/download/route.ts
 *
 * GET — download all received memories as a zip file
 *
 * Purpose:
 * - Receiver downloads all their released memories as a single zip
 * - Zip contains one folder per memory collection
 * - Each folder has: message.txt + all image/video attachments
 * - Attachments are fetched from R2/CDN URLs and included
 *
 * Security:
 * - Must be logged in
 * - Only downloads memories linked to the logged-in user's receiver records
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import JSZip from "jszip";

export const dynamic = "force-dynamic";

// Maximum file size to include in zip — prevent timeout on large videos
const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024; // 50MB per file

export async function GET() {
  try {
    // 1) Must be logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response("Not logged in.", { status: 401 });
    }

    const email = session.user.email.toLowerCase();

    // 2) Find the user
    const me = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    if (!me) {
      return new Response("User not found.", { status: 404 });
    }

    // 3) Find all receiver records linked to this user
    const linkedReceivers = await prisma.receiver.findMany({
      where: { linkedUserId: me.id },
      select: { id: true },
    });

    if (linkedReceivers.length === 0) {
      return new Response("No memories to download.", { status: 404 });
    }

    const receiverIds = linkedReceivers.map((r) => r.id);

    // 4) Find all released memory collections for these receivers
    const collections = await prisma.memoryCollection.findMany({
      where: {
        receiverId: { in: receiverIds },
        items: { some: { status: "RELEASED" } },
      },
      select: {
        id: true,
        title: true,
        owner: {
          select: { name: true },
        },
        items: {
          where: { status: "RELEASED" },
          select: {
            id: true,
            title: true,
            content: true,
            releasedAt: true,
            attachments: {
              select: {
                id: true,
                type: true,
                mediaUrl: true,
                mediaFileName: true,
                mediaMimeType: true,
              },
            },
          },
        },
      },
    });

    if (collections.length === 0) {
      return new Response("No released memories found.", { status: 404 });
    }

    // 5) Build the zip file in memory
    const zip = new JSZip();

    // Create a README at the root of the zip
    zip.file(
      "README.txt",
      `Time Bridge — Memory Archive\n` +
      `Downloaded for: ${me.name}\n` +
      `Downloaded at: ${new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" })} SGT\n` +
      `Total collections: ${collections.length}\n\n` +
      `This archive contains personal legacy messages left for you.\n` +
      `Each folder contains a message and any attached images or videos.\n`
    );

    // Process each collection
    for (const collection of collections) {
      // Create a safe folder name
      const folderName = sanitizeFolderName(
        `${collection.title} - From ${collection.owner?.name ?? "Sender"}`
      );

      const folder = zip.folder(folderName);
      if (!folder) continue;

      // Process each memory item in this collection
      for (let itemIndex = 0; itemIndex < collection.items.length; itemIndex++) {
        const item = collection.items[itemIndex];
        const itemPrefix = collection.items.length > 1
          ? `${itemIndex + 1}_${sanitizeFolderName(item.title)}`
          : sanitizeFolderName(item.title);

        // Add message text file
        const messageContent =
          `Title: ${item.title}\n` +
          `Released: ${item.releasedAt
            ? new Date(item.releasedAt).toLocaleString("en-SG", { timeZone: "Asia/Singapore" }) + " SGT"
            : "Unknown"
          }\n` +
          `From: ${collection.owner?.name ?? "Sender"}\n\n` +
          `--- Message ---\n\n` +
          item.content;

        folder.file(`${itemPrefix}.txt`, messageContent);

        // Download and add each attachment
        for (let attIndex = 0; attIndex < item.attachments.length; attIndex++) {
          const att = item.attachments[attIndex];

          try {
            // Fetch the attachment from R2 via CDN
            const response = await fetch(att.mediaUrl);

            if (!response.ok) {
              console.warn(`[download] Failed to fetch attachment ${att.id}: ${response.status}`);
              continue;
            }

            // Check content length before downloading
            const contentLength = Number(response.headers.get("content-length") ?? 0);
            if (contentLength > MAX_ATTACHMENT_BYTES) {
              folder.file(
                `${itemPrefix}_attachment_${attIndex + 1}_too_large.txt`,
                `This attachment is too large to include in the zip download.\n` +
                `Please download it directly from: ${att.mediaUrl}\n`
              );
              continue;
            }

            const buffer = await response.arrayBuffer();

            const ext = getFileExtension(att.mediaFileName, att.mediaMimeType, att.type);
            const fileName = `${itemPrefix}_${attIndex + 1}${ext}`;

            folder.file(fileName, buffer);

          } catch (err) {
            console.warn(`[download] Error fetching attachment ${att.id}:`, err);
            folder.file(
              `${itemPrefix}_attachment_${attIndex + 1}_error.txt`,
              `Failed to download this attachment. Please try again later.\n` +
              `Direct URL: ${att.mediaUrl}\n`
            );
          }
        }
      }
    }

    // 6) Generate the zip buffer
    const zipBuffer = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    // 7) Return the zip file as a download
    const fileName = `timebridge-memories-${Date.now()}.zip`;

    return new Response(zipBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(zipBuffer.byteLength),
      },
    });

  } catch (err) {
    console.error("GET /api/receiver/download error:", err);
    return new Response("Server error.", { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeFolderName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function getFileExtension(
  fileName: string | null,
  mimeType: string | null,
  type: string
): string {
  if (fileName) {
    const match = fileName.match(/\.[^.]+$/);
    if (match) return match[0];
  }

  if (mimeType) {
    const mimeMap: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "video/mp4": ".mp4",
      "video/quicktime": ".mov",
      "video/webm": ".webm",
    };
    if (mimeMap[mimeType]) return mimeMap[mimeType];
  }

  return type === "IMAGE" ? ".jpg" : ".mp4";
}
