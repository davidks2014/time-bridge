/**
 * src/app/api/auth/register/route.ts
 *
 * Purpose:
 * - Simple registration — name, email, password only
 * - Creates account immediately with no verification required
 * - NRIC, address, ID documents, trusted contact, and consent
 *   are collected later when the user tries to create their first memory
 *
 * This approach reduces registration friction and gets users
 * into the app quickly.
 */

import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Read basic registration fields
    const name     = String(body.name     ?? "").trim();
    const email    = String(body.email    ?? "").toLowerCase().trim();
    const password = String(body.password ?? "");

    // Validate required fields
    if (!name || !email || !password) {
      return Response.json(
        { error: "Name, email and password are required." },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const exists = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (exists) {
      return Response.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Hash password securely
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the user account
    // Profile fields (NRIC, address, phone) are left empty for now
    // They will be completed when the user tries to create their first memory
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        // Empty strings for required DB fields — completed during profile setup
        phoneNumber: "",
        identificationNo: "",
        address: "",
        // New users start as PENDING — admin must approve after NRIC verification
        verificationStatus: "PENDING",
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return Response.json(
      { message: "Account created successfully.", user },
      { status: 201 }
    );

  } catch (err: any) {
    console.error("register error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
