import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

/**
 * API: POST /api/auth/register
 *
 * Purpose:
 * - Register a new user using email + password
 * - Capture mandatory profile fields
 * - Upload verification images (NRIC / driving license)
 * - Set verificationStatus = PENDING (admin will approve later)
 *
 * Request type:
 * - multipart/form-data (because we upload files)
 *
 * Form fields expected:
 * - email, password, name, phoneNumber, identificationNo, address
 * - idFront (File)  [required for MVP]
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

    // 2) Read files
    const idFront = form.get("idFront");
    const idBack = form.get("idBack");

    // 3) Validate required fields
    if (!email || !password || !name || !phoneNumber || !identificationNo || !address) {
      return Response.json({ error: "All fields are required." }, { status: 400 });
    }

    // For MVP: require at least 1 verification image
    if (!(idFront instanceof File)) {
      return Response.json({ error: "Verification image (front) is required." }, { status: 400 });
    }

    // 4) Prevent duplicate email
    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) {
      return Response.json({ error: "Email already registered." }, { status: 409 });
    }

    // 5) Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 6) Save files to /public/uploads/verification
    async function saveUpload(file: File): Promise<string> {
      // Basic file type check (MVP)
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        throw new Error("Only JPG/PNG/WebP images are allowed.");
      }

      // Optional size limit (MVP) ~ 5MB
      const maxBytes = 5 * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new Error("File too large. Max 5MB.");
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      const ext =
        file.type === "image/png" ? "png" :
        file.type === "image/webp" ? "webp" : "jpg";

      const safeName = crypto.randomBytes(16).toString("hex");
      const filename = `${Date.now()}_${safeName}.${ext}`;

      const uploadDir = path.join(process.cwd(), "public", "uploads", "verification");
      await fs.mkdir(uploadDir, { recursive: true });

      const fullPath = path.join(uploadDir, filename);
      await fs.writeFile(fullPath, bytes);

      // Public URL that browser can load
      return `/uploads/verification/${filename}`;
    }

    const verificationDocFrontUrl = await saveUpload(idFront);

    let verificationDocBackUrl: string | null = null;
    if (idBack instanceof File && idBack.size > 0) {
      verificationDocBackUrl = await saveUpload(idBack);
    }

    // 7) Create user in DB (PENDING by default in schema)
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        phoneNumber,
        identificationNo,
        address,

        verificationDocFrontUrl,
        verificationDocBackUrl: verificationDocBackUrl ?? null,

        // verificationStatus default is PENDING in your schema
        // role default USER in your schema
      },
      select: { id: true, email: true, verificationStatus: true },
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

    // Friendly error messages for file validation
    const msg = String(err?.message ?? "");
    if (msg.includes("allowed") || msg.includes("Max 5MB")) {
      return Response.json({ error: msg }, { status: 400 });
    }

    return Response.json({ error: "Server error." }, { status: 500 });
  }
}