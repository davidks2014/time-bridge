import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import crypto from "crypto";
import cloudinary from "@/lib/cloudinary";

/**
 * API: POST /api/auth/register
 *
 * Purpose:
 * - Register a new user using email + password
 * - Capture mandatory profile fields
 * - Upload verification images (NRIC / driving license) to Cloudinary
 * - Set verificationStatus = PENDING (admin will approve later)
 *
 * Request type:
 * - multipart/form-data
 *
 * Form fields expected:
 * - email, password, name, phoneNumber, identificationNo, address
 * - idFront (File)  [required]
 * - idBack  (File)  [optional]
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();

    // 1) Read text fields
    const email = String(form.get("email") ?? "").toLowerCase().trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    const phoneNumber = String(form.get("phoneNumber") ?? "").trim();
    const identificationNo = String(form.get("identificationNo") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();

    // 2) Read uploaded files
    const idFront = form.get("idFront");
    const idBack = form.get("idBack");

    // 3) Validate required text fields
    if (!email || !password || !name || !phoneNumber || !identificationNo || !address) {
      return Response.json({ error: "All fields are required." }, { status: 400 });
    }

    // 4) Require at least front verification image
    if (!(idFront instanceof File)) {
      return Response.json(
        { error: "Verification image (front) is required." },
        { status: 400 }
      );
    }

    // 5) Prevent duplicate email
    const exists = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (exists) {
      return Response.json({ error: "Email already registered." }, { status: 409 });
    }

    // 6) Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    /**
     * Upload one image file to Cloudinary
     *
     * Why this is needed:
     * - local filesystem upload is not reliable on Vercel
     * - Cloudinary stores the image externally and returns a URL
     */
    async function uploadToCloudinary(file: File, side: "front" | "back"): Promise<string> {
      // Basic allowed image types
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        throw new Error("Only JPG/PNG/WebP images are allowed.");
      }

      // Max 5MB
      const maxBytes = 5 * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new Error("File too large. Max 5MB.");
      }

      // Convert browser File -> Node Buffer
      const bytes = Buffer.from(await file.arrayBuffer());

      // Small random suffix so public_id stays unique
      const safeName = crypto.randomBytes(8).toString("hex");

      // Upload using Cloudinary upload_stream
      return await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "time-bridge/verification",
            resource_type: "image",

            // Optimization: shrink very large images before storing
            transformation: [{ width: 1000, crop: "limit" }],

            public_id: `${identificationNo}_${side}_${Date.now()}_${safeName}`,
            overwrite: false,
          },
          (error, result) => {
            if (error) {
              reject(error);
              return;
            }

            if (!result?.secure_url) {
              reject(new Error("Cloudinary upload failed."));
              return;
            }

            resolve(result.secure_url);
          }
        );

        stream.end(bytes);
      });
    }

    // 7) Upload required front image
    const verificationDocFrontUrl = await uploadToCloudinary(idFront, "front");

    // 8) Upload optional back image
    let verificationDocBackUrl: string | null = null;
    if (idBack instanceof File && idBack.size > 0) {
      verificationDocBackUrl = await uploadToCloudinary(idBack, "back");
    }

    // 9) Create user in DB
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        phoneNumber,
        identificationNo,
        address,
        verificationDocFrontUrl,
        verificationDocBackUrl,

        // verificationStatus default = PENDING in schema
        // role default = USER in schema
      },
      select: {
        id: true,
        email: true,
        verificationStatus: true,
      },
    });

    return Response.json(
      {
        message: "Registered successfully. Awaiting admin verification.",
        user,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Register error:", err);

    const msg = String(err?.message ?? "");

    // Friendly validation messages
    if (
      msg.includes("Only JPG/PNG/WebP") ||
      msg.includes("Max 5MB") ||
      msg.includes("Cloudinary upload failed")
    ) {
      return Response.json({ error: msg }, { status: 400 });
    }

    return Response.json({ error: "Server error." }, { status: 500 });
  }
}