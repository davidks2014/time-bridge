import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    await prisma.user.delete({ where: { id: user.id } });

    return Response.json({ message: "Account deleted successfully." });

  } catch (err) {
    console.error("DELETE /api/account/delete error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
