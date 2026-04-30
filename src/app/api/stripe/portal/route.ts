/**
 * API: POST /api/stripe/portal
 *
 * Purpose: Create a Stripe Customer Portal session.
 * Used for manage subscription, cancel, or downgrade.
 *
 * Response: { url: string } — redirect user to Stripe portal
 */
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return Response.json({ error: "No subscription found." }, { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/profile`,
    });

    return Response.json({ url: portalSession.url });
  } catch (err) {
    console.error("POST /api/stripe/portal error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
