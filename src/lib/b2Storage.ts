import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  endpoint: process.env.B2_BUCKET_ENDPOINT!,
  region: "us-east-005",
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.B2_BUCKET_NAME!;
const CDN_URL =
  process.env.NEXT_PUBLIC_CDN_URL ?? "https://cdn.timebridge.sg";

export async function uploadToB2(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = "memories"
): Promise<string> {
  const key = `${folder}/${Date.now()}-${fileName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  return `${CDN_URL}/file/${BUCKET}/${key}`;
}

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
  return getSignedUrl(s3, command, { expiresIn });
}

export async function deleteFromB2(fileUrl: string): Promise<void> {
  try {
    const key = fileUrl.replace(`${CDN_URL}/file/${BUCKET}/`, "");
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (error) {
    console.error("B2 delete error:", error);
  }
}

export async function deleteFromB2ByKey(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (error) {
    console.error("B2 delete error:", error);
  }
}

export function getB2Url(key: string): string {
  return `${CDN_URL}/file/${BUCKET}/${key}`;
}
