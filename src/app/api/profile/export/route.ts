/**
 * src/app/api/profile/export/route.ts
 *
 * GET — export all user data as a JSON file
 *
 * Returns a downloadable JSON file containing:
 * - User profile
 * - All memory collections and items
 * - All receiver records
 * - Consent records
 *
 * PDPA requirement — users have the right to access all their data
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const email = session.user.email.toLowerCase();

    // Fetch all user data
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        identificationNo: true,
        address: true,
        confirmationIntervalDays: true,
        trustedContactName: true,
        trustedContactEmail: true,
        trustedContactPhone: true,
        verificationStatus: true,
        createdAt: true,
        // Include all memories
        collections: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            receiver: {
              select: {
                fullName: true,
                email: true,
                identificationNo: true,
                address: true,
              },
            },
            items: {
              select: {
                id: true,
                title: true,
                content: true,
                releaseDate: true,
                status: true,
                createdAt: true,
                attachments: {
                  select: {
                    type: true,
                    mediaUrl: true,
                    mediaFileName: true,
                  },
                },
              },
            },
          },
        },
        // Include consent records
        consents: {
          select: {
            consentType: true,
            consentGivenAt: true,
            ipAddress: true,
          },
        },
      },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // Build export object
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: "Time Bridge",
      notice: "This is a complete export of your personal data as required by PDPA.",
      profile: {
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        identificationNo: user.identificationNo,
        address: user.address,
        memberSince: user.createdAt,
        verificationStatus: user.verificationStatus,
        confirmationIntervalDays: user.confirmationIntervalDays,
        trustedContact: {
          name: user.trustedContactName,
          email: user.trustedContactEmail,
          phone: user.trustedContactPhone,
        },
      },
      memories: user.collections,
      consents: user.consents,
    };

    // Return as downloadable JSON file
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="timebridge-export-${Date.now()}.json"`,
      },
    });

  } catch (err) {
    console.error("GET /api/profile/export error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
