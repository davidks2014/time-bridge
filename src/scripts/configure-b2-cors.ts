/**
 * src/scripts/configure-b2-cors.ts
 *
 * Configures CORS on the Backblaze B2 bucket so browsers can PUT files
 * directly via presigned URLs.
 *
 * Run once: npx tsx src/scripts/configure-b2-cors.ts
 */

import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const endpoint =
  process.env.B2_BUCKET_ENDPOINT ?? "https://s3.us-east-005.backblazeb2.com";
const bucket = process.env.B2_BUCKET_NAME ?? "timebridge-memories";

const s3 = new S3Client({
  endpoint,
  region: "us-east-005",
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
  forcePathStyle: true,
});

async function configureCors() {
  const command = new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: [
            "https://timebridge.sg",
            "https://www.timebridge.sg",
            "http://localhost:3000",
          ],
          AllowedMethods: ["PUT", "GET", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  });

  await s3.send(command);
  console.log(`✅ CORS configured on bucket: ${bucket}`);
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Origins: timebridge.sg, www.timebridge.sg, localhost:3000`);
  console.log(`   Methods: PUT, GET, HEAD`);
}

configureCors().catch((err) => {
  console.error("❌ CORS configuration failed:", err.message ?? err);
  process.exit(1);
});
