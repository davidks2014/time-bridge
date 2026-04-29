/**
 * Script: configure-r2-cors.ts
 *
 * Purpose: Apply CORS rules to the Cloudflare R2 bucket so that
 * browsers on allowed origins can PUT files directly via presigned URLs.
 *
 * Run: npx tsx src/scripts/configure-r2-cors.ts
 *
 * Requires R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
 * R2_ENDPOINT to be set in the environment or .env.local.
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local so credentials are available when running locally
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: process.env.R2_ENDPOINT!,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME ?? "timebridge-memories";

async function configureCors() {
  const command = new PutBucketCorsCommand({
    Bucket: BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          // Allow presigned PUT uploads from all Time Bridge origins
          AllowedOrigins: [
            "https://timebridge.sg",
            "https://www.timebridge.sg",
            "http://localhost:3000",
            "https://time-bridge-git-develop-davidks2014s-projects.vercel.app",
          ],
          AllowedMethods: ["PUT"],
          AllowedHeaders: ["*"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  });

  await s3.send(command);
  console.log(`R2 CORS configured successfully on bucket: ${BUCKET}`);
}

configureCors().catch((err) => {
  console.error("Failed to configure R2 CORS:", err);
  process.exit(1);
});
