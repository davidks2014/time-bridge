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

/**
 * Simple in-memory rate limiter
 * Limits registration attempts to 5 per IP per hour
 * Protects against bot account creation that could drain email quota
 */
const registrationAttempts = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `register:${ip}`;
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const limit = registrationAttempts.get(key);
  if (!limit || limit.resetAt < now) {
    registrationAttempts.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (limit.count >= 5) return false;
  limit.count += 1;
  return true;
}

export async function POST(req: Request) {
  try {
    const rateLimitKey = getRateLimitKey(req);
    if (!checkRateLimit(rateLimitKey)) {
      return Response.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

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
