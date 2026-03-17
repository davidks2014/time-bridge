/**
 * STEP 3 — Receivers API
 *
 * Purpose:
 * - Owner can create receiver
 * - Owner can list receivers
 *
 * Updated:
 * - identificationNo is now required
 * - duplicate check is based on ownerId + identificationNo
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1) Ensure logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    // 2) Get current user id
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 3) Return receivers owned by user
    const receivers = await prisma.receiver.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        address: true,
        identificationNo: true,
        createdAt: true,
      },
    });

    return Response.json({ receivers });
  } catch (err) {
    console.error("GET receivers error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1) Ensure logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    // 2) Get user id
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // 3) Read request body
    const body = await req.json();

    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const address = String(body.address ?? "").trim();
    const identificationNo = String(body.identificationNo ?? "").trim();

    // 4) Validate required fields
    if (!fullName || !email || !phone || !address || !identificationNo) {
      return Response.json(
        {
          error:
            "fullName, email, phone, address, identificationNo are required.",
        },
        { status: 400 }
      );
    }

    // 5) Prevent duplicate receiver under same owner by identification number
    const existing = await prisma.receiver.findFirst({
      where: {
        ownerId: user.id,
        identificationNo,
      },
    });

    if (existing) {
      return Response.json(
        { error: "Receiver with this identification number already exists." },
        { status: 400 }
      );
    }

    // 6) Create receiver
    const receiver = await prisma.receiver.create({
      data: {
        ownerId: user.id,
        fullName,
        email,
        phone,
        address,
        identificationNo,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        address: true,
        identificationNo: true,
        createdAt: true,
      },
    });

    return Response.json({ receiver }, { status: 201 });
  } catch (err) {
    console.error("POST receivers error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}