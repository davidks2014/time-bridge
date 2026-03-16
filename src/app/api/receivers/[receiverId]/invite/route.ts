/**
 * API: POST /api/receivers/[receiverId]/invite
 *
 * Purpose:
 * - Owner generates invite link for a receiver
 * - Creates ReceiverInvite record
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import { NextRequest } from "next/server"; // ✅ added (recommended for validator)

type Params = {
  // ✅ Next.js 16: params is a Promise
  params: Promise<{ receiverId: string }>;
};

export const dynamic = "force-dynamic";

export async function POST(_: NextRequest, { params }: Params) {
  try {
    // 1️⃣ Check login
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    // 2️⃣ Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // ✅ Next.js 16: unwrap params before reading receiverId
    const { receiverId } = await params;

    // 3️⃣ Ensure receiver belongs to this user
    const receiver = await prisma.receiver.findFirst({
      where: {
        id: receiverId,
        ownerId: user.id,
      },
    });

    if (!receiver) {
      return Response.json(
        { error: "Receiver not found or not owned by you." },
        { status: 404 }
      );
    }

    // 4️⃣ Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    // 5️⃣ Create invite record
    await prisma.receiverInvite.create({
      data: {
        token,
        receiverId: receiver.id,
        receiverEmail: receiver.email,
        receiverName: receiver.fullName,
      },
    });

    const inviteLink = `${process.env.NEXTAUTH_URL}/receiver/invite/${token}`;

    return Response.json({ inviteLink });
  } catch (err) {
    console.error("Invite API error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}